import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { normalizeProductId } from '@/lib/products'
import { writeAuditLog } from '@/lib/audit-log'

type StripeSubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number | null
}

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Initialize clients inside the handler to avoid build-time issues
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

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

  const getCurrentPeriodEnd = (subscription: Stripe.Subscription) => (
    convertUnixToISO((subscription as StripeSubscriptionWithPeriod).current_period_end)
  )

  const buildSubscriptionUpdate = (
    subscription: Stripe.Subscription,
    customerId?: string | null,
    productId?: string | null,
  ) => {
    const normalizedProductId = normalizeProductId(productId || subscription.metadata.product_id)
    const currentPeriodEnd = getCurrentPeriodEnd(subscription)
    const trialEnd = convertUnixToISO(subscription.trial_end)

    return {
      subscription_status: subscription.status || 'active',
      subscription_plan: normalizedProductId,
      stripe_subscription_id: subscription.id,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      subscription_end_date: currentPeriodEnd,
      trial_end_date: trialEnd,
      plan: normalizedProductId || 'free',
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEnd,
    }
  }

  const resolveBillingOwner = async (subscription: Stripe.Subscription) => {
    const organizationId = subscription.metadata.organization_id
    const therapistId = subscription.metadata.therapist_id || subscription.metadata.billing_therapist_id
    if (organizationId) return { organizationId, therapistId: therapistId || null }
    if (!therapistId) return { organizationId: null, therapistId: null }

    const { data: therapist } = await supabaseAdmin
      .from('therapists')
      .select('organization_id')
      .eq('id', therapistId)
      .maybeSingle()
    return { organizationId: therapist?.organization_id || null, therapistId }
  }

  const updateOrganizationSubscription = async (
    organizationId: string,
    update: ReturnType<typeof buildSubscriptionUpdate>,
  ) => supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: update.subscription_status,
      subscription_plan: update.subscription_plan,
      stripe_subscription_id: update.stripe_subscription_id,
      ...(update.stripe_customer_id ? { stripe_customer_id: update.stripe_customer_id } : {}),
      current_period_end: update.current_period_end,
      trial_ends_at: update.trial_ends_at,
      plan: update.plan,
    })
    .eq('id', organizationId)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        console.log('[v0] Webhook: checkout.session.completed', {
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription,
          mode: session.mode
        })
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          const { organizationId, therapistId } = await resolveBillingOwner(subscription)
          const productId = normalizeProductId(subscription.metadata.product_id)

          console.log('[v0] Webhook: Subscription details', {
            subscriptionId: subscription.id,
            status: subscription.status,
            organizationId,
            productId,
            trialEnd: subscription.trial_end
          })

          if (organizationId) {
            console.log('[v0] Webhook: Date conversion', {
              raw_current_period_end: (subscription as StripeSubscriptionWithPeriod).current_period_end,
              raw_trial_end: subscription.trial_end,
              converted_subscription_end_date: getCurrentPeriodEnd(subscription),
              converted_trial_end_date: convertUnixToISO(subscription.trial_end),
            })

            const updateData = buildSubscriptionUpdate(subscription, session.customer as string, productId)

            console.log('[v0] Webhook: Updating organization', { organizationId, updateData })

            const { error } = await updateOrganizationSubscription(organizationId, updateData)

            if (error) {
              console.error('[v0] Webhook: Failed to update therapist', error)
            } else {
              console.log('[v0] Webhook: Organization updated successfully')
              await writeAuditLog({
                therapistId: therapistId || undefined,
                actorRole: 'system',
                action: 'subscription.changed',
                resourceType: 'stripe_subscription',
                resourceId: null,
                details: {
                  eventType: event.type,
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: session.customer,
                  organizationId,
                  status: subscription.status,
                  plan: productId,
                },
              })
            }
          } else {
            console.error('[v0] Webhook: No organization billing owner in subscription metadata')
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const { organizationId, therapistId } = await resolveBillingOwner(subscription)

        if (organizationId) {
          await updateOrganizationSubscription(organizationId, buildSubscriptionUpdate(subscription))

          await writeAuditLog({
            therapistId: therapistId || undefined,
            actorRole: 'system',
            action: 'subscription.changed',
            resourceType: 'stripe_subscription',
            resourceId: null,
            details: {
              eventType: event.type,
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              plan: normalizeProductId(subscription.metadata.product_id),
              organizationId,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { organizationId, therapistId } = await resolveBillingOwner(subscription)

        if (organizationId) {
          await supabaseAdmin
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              subscription_plan: 'free',
              plan: 'free',
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq('id', organizationId)

          await writeAuditLog({
            therapistId: therapistId || undefined,
            actorRole: 'system',
            action: 'subscription.changed',
            resourceType: 'stripe_subscription',
            resourceId: null,
            details: {
              eventType: event.type,
              stripeSubscriptionId: subscription.id,
              status: 'canceled',
              plan: 'free',
              organizationId,
            },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoiceWithSubscription
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
          )
          const { organizationId, therapistId } = await resolveBillingOwner(subscription)

          if (organizationId) {
            await supabaseAdmin
              .from('organizations')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', organizationId)

            await writeAuditLog({
              therapistId: therapistId || undefined,
              actorRole: 'system',
              action: 'subscription.changed',
              resourceType: 'stripe_invoice',
              resourceId: null,
              details: {
                eventType: event.type,
                stripeInvoiceId: invoice.id,
                stripeSubscriptionId: subscription.id,
                status: 'past_due',
                organizationId,
              },
            })
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
