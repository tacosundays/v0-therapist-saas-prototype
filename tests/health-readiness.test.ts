import assert from "node:assert/strict"
import { test } from "node:test"
import { getProductionReadiness } from "../lib/health-readiness.ts"

function completeEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://sessionsteps.com",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service-role",
    OPENAI_API_KEY: "openai",
    PAUBOX_API_KEY: "paubox",
    STRIPE_SECRET_KEY: "stripe",
    STRIPE_WEBHOOK_SECRET: "webhook",
    STRIPE_SOLO_PRICE_ID: "solo",
    STRIPE_GROUP_PRICE_ID: "group",
    STRIPE_GROWING_PRICE_ID: "growing",
  }
}

test("production readiness requires the complete launch configuration", () => {
  assert.deepEqual(getProductionReadiness(completeEnvironment()), {
    ready: true,
    configured: true,
    canonicalOrigin: true,
    checks: {
      application: true,
      database: true,
      ai: true,
      email: true,
      billing: true,
    },
  })

  const missingPaubox = completeEnvironment()
  delete missingPaubox.PAUBOX_API_KEY
  assert.equal(getProductionReadiness(missingPaubox).ready, false)

  const defaultPauboxEndpoint = completeEnvironment()
  delete defaultPauboxEndpoint.PAUBOX_ENDPOINT_USERNAME
  assert.equal(getProductionReadiness(defaultPauboxEndpoint).checks.email, true)
})

test("production readiness requires the canonical SessionSteps origin", () => {
  const previewOrigin = completeEnvironment()
  previewOrigin.NEXT_PUBLIC_APP_URL = "https://preview.example.test"

  assert.deepEqual(getProductionReadiness(previewOrigin), {
    ready: false,
    configured: false,
    canonicalOrigin: false,
    checks: {
      application: false,
      database: true,
      ai: true,
      email: true,
      billing: true,
    },
  })
})
