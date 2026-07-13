import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const calendarScopes = ["https://www.googleapis.com/auth/calendar.events.readonly"]

type CalendarConnection = {
  id: string
  therapist_id: string
  provider: string
  provider_account_email: string | null
  calendar_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string | null
  scopes: string[] | null
  generate_ai_prep_overnight: boolean
  connected_at: string
  updated_at: string
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getOrigin(request: Request) {
  const url = new URL(request.url)
  return process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`
}

export function getGoogleRedirectUri(request: Request) {
  return `${getOrigin(request)}/api/calendar/google/callback`
}

export function getGoogleClientConfig(request: Request) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || getGoogleRedirectUri(request)

  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.")
  }

  return { clientId, clientSecret, redirectUri }
}

export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Calendar service is not configured.")
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Calendar service is not configured.")
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

function getSecret() {
  const secret = process.env.GOOGLE_CALENDAR_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Calendar token encryption is not configured.")
  return crypto.createHash("sha256").update(secret).digest()
}

export function encryptToken(token: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", getSecret(), iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function decryptToken(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".")
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored calendar token is invalid.")
  const decipher = crypto.createDecipheriv("aes-256-gcm", getSecret(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

export function signState(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url")
  return `${body}.${signature}`
}

export function verifyState<T extends Record<string, unknown>>(state: string): T {
  const [body, signature] = state.split(".")
  if (!body || !signature) throw new Error("Calendar connection state is invalid.")
  const expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url")
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Calendar connection state could not be verified.")
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T
  if (typeof payload.exp === "number" && Date.now() > payload.exp) {
    throw new Error("Calendar connection state expired.")
  }
  return payload
}

export async function resolveTherapistFromToken(request: Request) {
  const bearerToken = getBearerToken(request)
  if (!bearerToken) {
    return { error: "Missing authentication token", status: 401 as const }
  }

  const authClient = getAuthClient()
  const { data: { user }, error: userError } = await authClient.auth.getUser(bearerToken)

  if (userError || !user?.email) {
    return { error: "You must be logged in to use calendar integration", status: 401 as const }
  }

  const adminClient = getAdminClient()
  const { data: therapist, error: therapistError } = await adminClient
    .from("therapists")
    .select("id, full_name, email")
    .ilike("email", normalizeEmail(user.email))
    .maybeSingle()

  if (therapistError) {
    return { error: therapistError.message, status: 500 as const }
  }

  if (!therapist) {
    return { error: "No therapist account found for your email", status: 403 as const }
  }

  return { adminClient, therapist, user }
}

export function getGoogleAuthUrl(request: Request, state: string) {
  const { clientId, redirectUri } = getGoogleClientConfig(request)
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", calendarScopes.join(" "))
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeCodeForTokens(request: Request, code: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleClientConfig(request)
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || "Google Calendar connection failed.")
  }
  return payload as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
}

export async function refreshAccessToken(request: Request, connection: CalendarConnection) {
  const { clientId, clientSecret } = getGoogleClientConfig(request)
  const refreshToken = decryptToken(connection.refresh_token_encrypted)
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Google Calendar token refresh failed.")
  }

  const tokenExpiresAt = new Date(Date.now() + ((payload.expires_in || 3600) - 60) * 1000).toISOString()
  const adminClient = getAdminClient()
  await adminClient
    .from("therapist_calendar_connections")
    .update({
      access_token_encrypted: encryptToken(payload.access_token),
      token_expires_at: tokenExpiresAt,
    })
    .eq("id", connection.id)
    .eq("therapist_id", connection.therapist_id)

  return payload.access_token as string
}

export async function getAccessToken(request: Request, connection: CalendarConnection) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
  if (expiresAt > Date.now() + 60_000) {
    return decryptToken(connection.access_token_encrypted)
  }
  return refreshAccessToken(request, connection)
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  return response.json().catch(() => null) as Promise<{ email?: string } | null>
}

export type { CalendarConnection }
