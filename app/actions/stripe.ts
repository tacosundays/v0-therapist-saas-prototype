'use server'

import { stripe } from '../../lib/stripe'
import { getProductById, getStripePriceId, normalizeProductId, PRODUCTS } from '../../lib/products'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { resolveTenantContext } from '@/lib/tenant-context'
import type Stripe from 'stripe'

// Create admin client for server-side operations (doesn't rely on cookies)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

async function getBillingContext(requireBillingAdmin = false) {
  const sessionClient = await createServerClient()
  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user?.email) return null

  const admin = getSupabaseAdmin()
  const tenant = await resolveTenantContext(admin, user)
  if (!tenant || (requireBillingAdmin && !['owner', 'admin'].includes(tenant.role))) return null

  return { admin, tenant, user }
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

function getStripeSecretKeyPrefix() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return secretKey.slice(0, 8)
}

function logStripeCheckoutEnv(stage: string, productId: string, priceId: string) {
  console.error(`[v0] Stripe checkout ${stage}`, {
    stripeSecretKeyPrefix: getStripeSecretKeyPrefix(),
    stripeSoloPriceId: process.env.STRIPE_SOLO_PRICE_ID || null,
    stripeGrowingPriceId: process.env.STRIPE_GROWING_PRICE_ID || null,
    stripeGroupPriceId: process.env.STRIPE_GROUP_PRICE_ID || null,
    selectedPlanId: productId,
    selectedPriceId: priceId,
  })
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

    const context = await getBillingContext(true)
    if (!context) {
      return { error: 'You must be logged in to subscribe' }
    }

    const { admin: supabase, tenant, user } = context
    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', tenant.organizationId)
      .single()

    if (organizationError || !organization) {
      return { error: `Failed to load organization billing: ${organizationError?.message || 'not found'}` }
    }

    let customerId = organization.stripe_customer_id

    // Create a Stripe customer if one doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: organization.name,
        metadata: {
          organization_id: tenant.organizationId,
          billing_therapist_id: tenant.therapistId,
        },
      })
      customerId = customer.id

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenant.organizationId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    logStripeCheckoutEnv('before checkout session create', product.id, priceId)

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
          organization_id: tenant.organizationId,
          therapist_id: tenant.therapistId,
          product_id: product.id,
        },
      },
    })

    if (!session.url) {
      return { error: 'Failed to create checkout session' }
    }

    console.error('[v0] Stripe checkout session created', {
      checkoutSessionId: session.id,
      productId: product.id,
      priceId,
    })

    return { url: session.url }
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to start checkout' }
  }
}

export async function getSubscriptionStatus(userData?: UserData) {
  const context = await getBillingContext()
  if (!context) {
    return { status: 'unauthenticated', subscription: null }
  }

  const { data: organization } = await context.admin
    .from('organizations')
    .select('subscription_status, subscription_plan, plan, current_period_end, trial_ends_at')
    .eq('id', context.tenant.organizationId)
    .single()

  if (!organization) {
    return { status: 'no_organization', subscription: null }
  }

  // Check trial status
  const now = new Date()
  const trialEndValue = organization.trial_ends_at
  const currentPeriodEndValue = organization.current_period_end
  const trialEndDate = trialEndValue ? new Date(trialEndValue) : null
  const isInTrial = trialEndDate && trialEndDate > now && organization.subscription_status !== 'active'

  const normalizedPlan = normalizeProductId(organization.plan || organization.subscription_plan) || 'free'

  return {
    status: organization.subscription_status || (isInTrial ? 'trialing' : 'inactive'),
    subscription: {
      plan: normalizedPlan,
      endDate: currentPeriodEndValue,
      trialEndDate: trialEndValue,
      isInTrial: Boolean(isInTrial),
    },
  }
}

export async function createCustomerPortalSession(userData: UserData) {
  const context = await getBillingContext(true)
  if (!context) {
    throw new Error('You must be logged in')
  }

  const { data: organization } = await context.admin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', context.tenant.organizationId)
    .single()

  if (!organization?.stripe_customer_id) {
    throw new Error('No subscription found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
  })

  return session.url
}

// Verify and activate subscription after successful checkout
// This is a fallback in case the webhook is delayed or not configured
export async function verifyAndActivateSubscription(sessionId: string, userData: UserData) {
  if (!sessionId) {
    return { success: false, error: 'Missing required data' }
  }

  try {
    const context = await getBillingContext(true)
    if (!context) return { success: false, error: 'You must be logged in' }
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
    const organizationId = subscription.metadata.organization_id

    if (!organizationId || organizationId !== context.tenant.organizationId) {
      return { success: false, error: 'Subscription does not belong to this organization' }
    }

    const supabase = context.admin

    console.log('[v0] Date conversion:', {
      raw_current_period_end: (subscription as StripeSubscriptionWithPeriod).current_period_end,
      raw_trial_end: subscription.trial_end,
      converted_subscription_end_date: getSubscriptionPeriodEnd(subscription),
      converted_trial_end_date: getTrialEnd(subscription),
    })

    const updateData = billingUpdateData(subscription, session.customer as string, productId)

    console.log('[v0] Updating organization billing with:', updateData)

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: updateData.subscription_status,
        subscription_plan: updateData.subscription_plan,
        stripe_subscription_id: updateData.stripe_subscription_id,
        stripe_customer_id: updateData.stripe_customer_id,
        current_period_end: updateData.current_period_end,
        trial_ends_at: updateData.trial_ends_at,
        plan: updateData.plan,
      })
      .eq('id', organizationId)

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
