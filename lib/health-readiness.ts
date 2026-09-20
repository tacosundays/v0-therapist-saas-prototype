const requiredProductionVariables = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "PAUBOX_API_KEY",
  "PAUBOX_ENDPOINT_USERNAME",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SOLO_PRICE_ID",
  "STRIPE_GROUP_PRICE_ID",
  "STRIPE_GROWING_PRICE_ID",
] as const

export function getProductionReadiness(environment: NodeJS.ProcessEnv) {
  const configured = requiredProductionVariables.every((name) => Boolean(environment[name]?.trim()))
  const appUrl = environment.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
  const canonicalOrigin = appUrl === "https://sessionsteps.com"

  return {
    ready: configured && canonicalOrigin,
    configured,
    canonicalOrigin,
  }
}
