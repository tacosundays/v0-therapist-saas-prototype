'use server'

import { stripe } from '../../lib/stripe'
import { PRODUCTS } from '../../lib/products'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Create admin client for server-side operations (doesn't rely on cookies)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

interface UserData {
  id: string
  email: string
  fullName?: string
  practiceName?: string
}

export async function startSubscriptionCheckout(productId: string, userData: UserData) {
  try {
    const product = PRODUCTS.find((p) => p.id === productId)
    if (!product) {
      return { error: `Product with id "${productId}" not found` }
    }

    if (product.isEnterprise) {
      return { error: 'Please contact sales for Enterprise pricing' }
    }

    // Validate user data
    if (!userData?.id || !userData?.email) {
      return { error: 'You must be logged in to subscribe' }
    }

    const supabase = getSupabaseAdmin()

    // Upsert therapist row - create if doesn't exist, update if it does
    // Only use columns that exist: id, full_name, practice_name, email
    const { data: therapist, error: upsertError } = await supabase
      .from('therapists')
      .upsert({
        id: userData.id,
        full_name: userData.fullName || userData.email,
        practice_name: userData.practiceName || 'My Practice',
        email: userData.email,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select('stripe_customer_id')
      .single()

    if (upsertError) {
      console.error('Therapist upsert error:', upsertError)
      return { error: `Failed to create therapist profile: ${upsertError.message}` }
    }

    let customerId = therapist?.stripe_customer_id

    // Create a Stripe customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          therapist_id: userData.id,
        },
      })
      customerId = customer.id

      // Save customer ID to therapist record
      await supabase
        .from('therapists')
        .update({ stripe_customer_id: customerId })
        .eq('id', userData.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create redirect-based checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.priceInCents,
            recurring: {
              interval: product.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: {
          therapist_id: userData.id,
          product_id: productId,
        },
      },
    })

    if (!session.url) {
      return { error: 'Failed to create checkout session' }
    }

    return { url: session.url }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to start checkout' }
  }
}

export async function getSubscriptionStatus(userData?: UserData) {
  if (!userData?.id) {
    return { status: 'unauthenticated', subscription: null }
  }

  const supabase = getSupabaseAdmin()
  const { data: therapist } = await supabase
    .from('therapists')
    .select('subscription_status, subscription_plan, subscription_end_date, trial_end_date')
    .eq('id', userData.id)
    .single()

  if (!therapist) {
    return { status: 'no_therapist', subscription: null }
  }

  // Check trial status
  const now = new Date()
  const trialEndDate = therapist.trial_end_date ? new Date(therapist.trial_end_date) : null
  const isInTrial = trialEndDate && trialEndDate > now && therapist.subscription_status !== 'active'

  return {
    status: therapist.subscription_status || (isInTrial ? 'trialing' : 'inactive'),
    subscription: {
      plan: therapist.subscription_plan,
      endDate: therapist.subscription_end_date,
      trialEndDate: therapist.trial_end_date,
      isInTrial,
    },
  }
}

export async function createCustomerPortalSession(userData: UserData) {
  if (!userData?.id) {
    throw new Error('You must be logged in')
  }

  const supabase = getSupabaseAdmin()
  const { data: therapist } = await supabase
    .from('therapists')
    .select('stripe_customer_id')
    .eq('id', userData.id)
    .single()

  if (!therapist?.stripe_customer_id) {
    throw new Error('No subscription found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: therapist.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
  })

  return session.url
}

// Verify and activate subscription after successful checkout
// This is a fallback in case the webhook is delayed or not configured
export async function verifyAndActivateSubscription(sessionId: string, userData: UserData) {
  if (!userData?.id || !sessionId) {
    return { success: false, error: 'Missing required data' }
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.default_payment_method']
    })

    console.log('[v0] Checkout session:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription,
      customer: session.customer
    })

    // For subscriptions, check session status instead of payment_status
    // payment_status can be 'no_payment_required' for trials
    if (session.status !== 'complete') {
      return { success: false, error: `Checkout not complete. Status: ${session.status}` }
    }

    if (!session.subscription) {
      return { success: false, error: 'No subscription found in session' }
    }

    const subscription = typeof session.subscription === 'string' 
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription

    const productId = subscription.metadata.product_id
    const therapistId = subscription.metadata.therapist_id

    // Verify the therapist ID matches (if present in metadata)
    if (therapistId && therapistId !== userData.id) {
      return { success: false, error: 'Subscription does not belong to this user' }
    }

    const supabase = getSupabaseAdmin()

    // Determine subscription status based on Stripe subscription status
    const subscriptionStatus = subscription.status || 'active'

    // Convert Unix timestamp (seconds) to ISO string, returns null if invalid
    const convertUnixToISO = (unixSeconds: number | null | undefined): string | null => {
      if (unixSeconds === null || unixSeconds === undefined) {
        return null
      }
      if (typeof unixSeconds !== 'number' || unixSeconds <= 0) {
        return null
      }
      const date = new Date(unixSeconds * 1000)
      if (isNaN(date.getTime())) {
        return null
      }
      return date.toISOString()
    }

    // Get dates from subscription
    const subscriptionEndDate = convertUnixToISO(subscription.current_period_end)
    const trialEndDate = convertUnixToISO(subscription.trial_end)

    console.log('[v0] Date conversion:', {
      raw_current_period_end: subscription.current_period_end,
      raw_trial_end: subscription.trial_end,
      converted_subscription_end_date: subscriptionEndDate,
      converted_trial_end_date: trialEndDate,
    })

    // Update the therapist record with subscription info
    const updateData = {
      subscription_status: subscriptionStatus,
      subscription_plan: productId || null,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer as string,
      subscription_end_date: subscriptionEndDate,
      trial_end_date: trialEndDate,
    }

    console.log('[v0] Updating therapist with:', updateData)

    const { error: updateError } = await supabase
      .from('therapists')
      .update(updateData)
      .eq('id', userData.id)

    if (updateError) {
      console.error('[v0] Failed to update subscription:', updateError)
      return { success: false, error: `Failed to activate subscription: ${updateError.message}` }
    }

    console.log('[v0] Subscription activated successfully')
    return { success: true }
  } catch (error) {
    console.error('[v0] Verify subscription error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Verification failed' }
  }
}
