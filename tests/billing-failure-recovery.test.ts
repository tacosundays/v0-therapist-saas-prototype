import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const billingPage = readFileSync("app/dashboard/billing/page.tsx", "utf8")
const stripeActions = readFileSync("app/actions/stripe.ts", "utf8")
const stripeWebhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")

test("billing page exits loading state and explains recoverable failures", () => {
  assert.match(billingPage, /Your session could not be verified/)
  assert.match(billingPage, /Billing could not be loaded/)
  assert.match(billingPage, /Checkout was canceled\. No charge was made\./)
  assert.match(billingPage, /billing portal could not be opened/)
  assert.match(billingPage, /finally \{[\s\S]{0,180}setIsLoading\(false\)/)
})

test("billing UI does not log checkout session identifiers", () => {
  assert.doesNotMatch(billingPage, /console\.log/)
  assert.doesNotMatch(billingPage, /Payment received! \$\{result\.error/)
})

test("server actions return safe billing errors", () => {
  assert.doesNotMatch(stripeActions, /error instanceof Error \? error\.message/)
  assert.doesNotMatch(stripeActions, /organizationError\?\.message/)
  assert.match(stripeActions, /Checkout could not be started\. Please try again\./)
})

test("Stripe webhooks retry database failures and recover successful payments", () => {
  assert.match(stripeWebhook, /requireDatabaseSuccess/)
  assert.match(stripeWebhook, /case 'invoice\.payment_succeeded'/)
  assert.match(stripeWebhook, /case 'invoice\.payment_failed'/)
  assert.match(stripeWebhook, /throw new Error\(`Database update failed during \$\{operation\}`\)/)
})
