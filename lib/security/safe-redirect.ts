export function getSafeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback

  try {
    const parsed = new URL(value, "https://sessionsteps.com")
    if (parsed.origin !== "https://sessionsteps.com") return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
