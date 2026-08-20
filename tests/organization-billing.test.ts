import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const actions = readFileSync("app/actions/stripe.ts", "utf8")
const webhook = readFileSync("app/api/webhooks/stripe/route.ts", "utf8")
const migration = readFileSync("supabase/migrations/027_move_billing_entitlements_to_organizations.sql", "utf8")

test("billing actions resolve the authenticated organization instead of trusting browser ids", () => {
  assert.match(actions, /auth\.getUser\(\)/)
  assert.match(actions, /resolveTenantContext\(admin, user\)/)
  assert.doesNotMatch(actions, /\.eq\('id', userData\.id\)/)
  assert.doesNotMatch(actions, /metadata:\s*\{\s*therapist_id:\s*userData\.id/)
  assert.match(actions, /organization_id: tenant\.organizationId/)
})

test("only organization owners and admins can manage billing", () => {
  assert.match(actions, /getBillingContext\(true\)/)
  assert.match(actions, /\['owner', 'admin'\]\.includes\(tenant\.role\)/)
  assert.match(migration, /om\.role IN \('owner', 'admin'\)/)
})

test("Stripe webhook writes entitlements to organizations with legacy metadata fallback", () => {
  assert.match(webhook, /subscription\.metadata\.organization_id/)
  assert.match(webhook, /select\('organization_id'\)/)
  assert.match(webhook, /from\('organizations'\)/)
  assert.doesNotMatch(webhook, /from\('therapists'\)[\s\S]{0,120}\.update\(/)
})

test("organization billing migration backfills current subscriptions", () => {
  assert.match(migration, /FROM public\.therapists t/)
  assert.match(migration, /t\.id = o\.billing_owner_therapist_id/)
  assert.match(migration, /organizations_stripe_customer_id_unique/)
  assert.match(migration, /organizations_stripe_subscription_id_unique/)
})
