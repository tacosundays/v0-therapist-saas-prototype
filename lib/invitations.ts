export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function createInviteToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function hashInviteToken(token: string) {
  const encoded = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return bytesToHex(new Uint8Array(digest))
}

export function buildClientInviteLink(origin: string, email: string, token: string) {
  const url = new URL("/signup", origin)
  url.searchParams.set("role", "client")
  url.searchParams.set("email", normalizeInviteEmail(email))
  url.searchParams.set("invite", token)
  return url.toString()
}
