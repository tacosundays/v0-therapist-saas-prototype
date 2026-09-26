type RuntimeEnv = Partial<
  Record<"VERCEL_ENV" | "NEXT_PUBLIC_APP_URL" | "VERCEL_URL" | "NODE_ENV", string | undefined>
>

export const CANONICAL_APP_URL = "https://sessionsteps.com"

function normalizeUrl(value?: string) {
  if (!value?.trim()) return null

  const trimmed = value.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return null
  }
}

export function getAppBaseUrl(env: RuntimeEnv = process.env) {
  if (env.VERCEL_ENV === "production") return CANONICAL_APP_URL

  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    return normalizeUrl(env.VERCEL_URL) || CANONICAL_APP_URL
  }

  const configuredUrl = normalizeUrl(env.NEXT_PUBLIC_APP_URL)
  if (configuredUrl) return configuredUrl

  const vercelUrl = normalizeUrl(env.VERCEL_URL)
  if (vercelUrl) return vercelUrl

  if (env.NODE_ENV === "production") return CANONICAL_APP_URL

  return "http://localhost:3000"
}
