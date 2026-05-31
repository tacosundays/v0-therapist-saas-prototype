import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

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
          
          const therapistId = subscription.metadata.therapist_id
          const productId = subscription.metadata.product_id

          console.log('[v0] Webhook: Subscription details', {
            subscriptionId: subscription.id,
            status: subscription.status,
            therapistId,
            productId,
            trialEnd: subscription.trial_end
          })

          if (therapistId) {
            const subscriptionStatus = subscription.status || 'active'

            // Convert dates
            const subscriptionEndDate = convertUnixToISO(subscription.current_period_end)
            const trialEndDate = convertUnixToISO(subscription.trial_end)

            console.log('[v0] Webhook: Date conversion', {
              raw_current_period_end: subscription.current_period_end,
              raw_trial_end: subscription.trial_end,
              converted_subscription_end_date: subscriptionEndDate,
              converted_trial_end_date: trialEndDate,
            })

            const updateData = {
              subscription_status: subscriptionStatus,
              subscription_plan: productId || null,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer as string,
              subscription_end_date: subscriptionEndDate,
              trial_end_date: trialEndDate,
            }

            console.log('[v0] Webhook: Updating therapist', { therapistId, updateData })

            const { error } = await supabaseAdmin
              .from('therapists')
              .update(updateData)
              .eq('id', therapistId)

            if (error) {
              console.error('[v0] Webhook: Failed to update therapist', error)
            } else {
              console.log('[v0] Webhook: Therapist updated successfully')
            }
          } else {
            console.error('[v0] Webhook: No therapist_id in subscription metadata')
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const therapistId = subscription.metadata.therapist_id

        if (therapistId) {
          const subscriptionEndDate = convertUnixToISO(subscription.current_period_end)
          const trialEndDate = convertUnixToISO(subscription.trial_end)

          await supabaseAdmin
            .from('therapists')
            .update({
              subscription_status: subscription.status || 'active',
              subscription_end_date: subscriptionEndDate,
              trial_end_date: trialEndDate,
            })
            .eq('id', therapistId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const therapistId = subscription.metadata.therapist_id

        if (therapistId) {
          await supabaseAdmin
            .from('therapists')
            .update({
              subscription_status: 'canceled',
              subscription_plan: null,
              stripe_subscription_id: null,
            })
            .eq('id', therapistId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const therapistId = subscription.metadata.therapist_id

          if (therapistId) {
            await supabaseAdmin
              .from('therapists')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', therapistId)
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
