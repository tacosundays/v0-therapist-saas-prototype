import 'server-only'

import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error("Stripe is not configured.")
}

export const stripe = new Stripe(stripeSecretKey)
