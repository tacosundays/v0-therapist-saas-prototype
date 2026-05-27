import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Use service role for webhook handler
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          const therapistId = subscription.metadata.therapist_id
          const productId = subscription.metadata.product_id

          if (therapistId) {
            await supabaseAdmin
              .from('therapists')
              .update({
                subscription_status: 'active',
                subscription_plan: productId,
                stripe_subscription_id: subscription.id,
                subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', therapistId)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const therapistId = subscription.metadata.therapist_id

        if (therapistId) {
          await supabaseAdmin
            .from('therapists')
            .update({
              subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
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
