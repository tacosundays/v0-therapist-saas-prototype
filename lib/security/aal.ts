export type AssuranceLevel = "aal1" | "aal2" | null

export function getJwtAssuranceLevel(token: string): AssuranceLevel {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    const decoded = JSON.parse(atob(normalized)) as { aal?: unknown }
    return decoded.aal === "aal1" || decoded.aal === "aal2" ? decoded.aal : null
  } catch {
    return null
  }
}

export function hasAal2(token: string) {
  return getJwtAssuranceLevel(token) === "aal2"
}
