'use server'

import { stripe } from '../../lib/stripe'
import { getProductById, getStripePriceId, normalizeProductId, PRODUCTS } from '../../lib/products'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

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

type StripeSubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null
}

function convertUnixToISO(unixSeconds: number | null | undefined): string | null {
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

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  return convertUnixToISO((subscription as StripeSubscriptionWithPeriod).current_period_end)
}

function getTrialEnd(subscription: Stripe.Subscription): string | null {
  return convertUnixToISO(subscription.trial_end)
}

function billingUpdateData(subscription: Stripe.Subscription, customerId: string | null, productId: string | null) {
  const normalizedProductId = normalizeProductId(productId)
  const currentPeriodEnd = getSubscriptionPeriodEnd(subscription)
  const trialEnd = getTrialEnd(subscription)

  return {
    subscription_status: subscription.status || 'active',
    subscription_plan: normalizedProductId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    subscription_end_date: currentPeriodEnd,
    trial_end_date: trialEnd,
    plan: normalizedProductId || 'free',
    current_period_end: currentPeriodEnd,
    trial_ends_at: trialEnd,
  }
}

export async function getCheckoutAvailability() {
  return Object.fromEntries(
    PRODUCTS.map((product) => [product.id, Boolean(getStripePriceId(product.id))])
  )
}

async function logAndVerifyStripeCheckoutConfig(productId: string, priceId: string) {
  const [account, price] = await Promise.all([
    stripe.accounts.retrieve(null),
    stripe.prices.retrieve(priceId),
  ])

  console.log('[v0] Stripe checkout config', {
    stripeAccountId: account.id,
    stripeAccountCountry: account.country,
    stripeAccountChargesEnabled: account.charges_enabled,
    productId,
    priceId,
    stripeSoloPriceId: process.env.STRIPE_SOLO_PRICE_ID || null,
    soloPriceMatchesExpected: process.env.STRIPE_SOLO_PRICE_ID === 'price_1ThywzQ73wnXTr0yEVh5VwC9',
    priceLivemode: price.livemode,
    priceActive: price.active,
    priceCurrency: price.currency,
    priceUnitAmount: price.unit_amount,
    priceRecurringInterval: price.recurring?.interval || null,
    priceProduct: typeof price.product === 'string' ? price.product : price.product.id,
  })

  return { account, price }
}

export async function startSubscriptionCheckout(productId: string, userData: UserData) {
  try {
    const normalizedProductId = normalizeProductId(productId)
    const product = normalizedProductId ? getProductById(normalizedProductId) : null
    if (!product) {
      return { error: `Product with id "${productId}" not found` }
    }

    const priceId = getStripePriceId(product.id)

    if (!priceId) {
      return { error: `${product.name} checkout is not configured yet. Please contact sales.` }
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
    const { account, price } = await logAndVerifyStripeCheckoutConfig(product.id, priceId)

    // Create redirect-based checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: {
          therapist_id: userData.id,
          product_id: product.id,
        },
      },
    })

    if (!session.url) {
      return { error: 'Failed to create checkout session' }
    }

    console.log('[v0] Stripe checkout session created', {
      stripeAccountId: account.id,
      checkoutSessionId: session.id,
      productId: product.id,
      priceId: price.id,
    })

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
    .select('subscription_status, subscription_plan, subscription_end_date, trial_end_date, plan, current_period_end, trial_ends_at')
    .eq('id', userData.id)
    .single()

  if (!therapist) {
    return { status: 'no_therapist', subscription: null }
  }

  // Check trial status
  const now = new Date()
  const trialEndValue = therapist.trial_ends_at || therapist.trial_end_date
  const currentPeriodEndValue = therapist.current_period_end || therapist.subscription_end_date
  const trialEndDate = trialEndValue ? new Date(trialEndValue) : null
  const isInTrial = trialEndDate && trialEndDate > now && therapist.subscription_status !== 'active'

  const normalizedPlan = normalizeProductId(therapist.plan || therapist.subscription_plan) || 'free'

  return {
    status: therapist.subscription_status || (isInTrial ? 'trialing' : 'inactive'),
    subscription: {
      plan: normalizedPlan,
      endDate: currentPeriodEndValue,
      trialEndDate: trialEndValue,
      isInTrial: Boolean(isInTrial),
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

    const productId = normalizeProductId(subscription.metadata.product_id)
    const therapistId = subscription.metadata.therapist_id

    // Verify the therapist ID matches (if present in metadata)
    if (therapistId && therapistId !== userData.id) {
      return { success: false, error: 'Subscription does not belong to this user' }
    }

    const supabase = getSupabaseAdmin()

    console.log('[v0] Date conversion:', {
      raw_current_period_end: (subscription as StripeSubscriptionWithPeriod).current_period_end,
      raw_trial_end: subscription.trial_end,
      converted_subscription_end_date: getSubscriptionPeriodEnd(subscription),
      converted_trial_end_date: getTrialEnd(subscription),
    })

    // Update the therapist record with subscription info
    const updateData = billingUpdateData(subscription, session.customer as string, productId)

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
