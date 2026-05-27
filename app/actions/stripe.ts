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

    // Verify user exists in therapists table
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('stripe_customer_id')
      .eq('id', userData.id)
      .single()

    if (therapistError || !therapist) {
      return { error: 'Therapist account not found. Please complete your profile first.' }
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
      success_url: `${baseUrl}/dashboard/billing?success=true`,
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
