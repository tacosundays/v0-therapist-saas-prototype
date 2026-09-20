function hasValues(environment: NodeJS.ProcessEnv, names: string[]) {
  return names.every((name) => Boolean(environment[name]?.trim()))
}

export function getProductionReadiness(environment: NodeJS.ProcessEnv, requestOrigin?: string) {
  const appUrl = environment.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
  const observedOrigin = requestOrigin?.trim().replace(/\/$/, "")
  const canonicalOrigin =
    appUrl === "https://sessionsteps.com" || observedOrigin === "https://sessionsteps.com"
  const checks = {
    application: canonicalOrigin,
    database: hasValues(environment, [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]),
    ai: hasValues(environment, ["OPENAI_API_KEY"]),
    email: hasValues(environment, ["PAUBOX_API_KEY"]),
    billing: hasValues(environment, [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_SOLO_PRICE_ID",
      "STRIPE_GROUP_PRICE_ID",
      "STRIPE_GROWING_PRICE_ID",
    ]),
  }
  const configured = Object.values(checks).every(Boolean)

  return {
    ready: configured,
    configured,
    canonicalOrigin,
    checks,
  }
}
