import "server-only"

import { createClient } from "@supabase/supabase-js"
import { isAnalyticsEventName, sanitizeAnalyticsProperties, type AnalyticsEventInput } from "@/lib/analytics/events"

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || ""
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null
}

export function getAnalyticsClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return null
  return {
    auth: createClient(url, anonKey),
    admin: createClient(url, serviceKey),
  }
}

type AnalyticsAdminClient = NonNullable<ReturnType<typeof getAnalyticsClients>>["admin"]

export async function authenticateAnalyticsRequest(request: Request) {
  const clients = getAnalyticsClients()
  const token = getBearerToken(request)
  if (!clients || !token) return null
  const { data: { user }, error } = await clients.auth.auth.getUser(token)
  if (error || !user) return null
  return { ...clients, user }
}

export async function resolveTherapistId(
  admin: AnalyticsAdminClient,
  user: { id: string; email?: string | null },
) {
  const byId = await admin.from("therapists").select("id").eq("id", user.id).maybeSingle()
  if (byId.data?.id) return byId.data.id as string
  if (!user.email) return null
  const byEmail = await admin.from("therapists").select("id").ilike("email", user.email.trim().toLowerCase()).maybeSingle()
  return (byEmail.data?.id as string | undefined) || null
}

export async function writeProductAnalyticsEvent(
  admin: AnalyticsAdminClient,
  therapistId: string,
  event: AnalyticsEventInput,
  sessionId?: string | null,
) {
  if (!isAnalyticsEventName(event.name)) return { error: new Error("Unsupported analytics event") }
  const payload = {
    therapist_id: therapistId,
    event_name: event.name,
    event_key: event.eventKey || null,
    session_id: sessionId || null,
    properties: sanitizeAnalyticsProperties(event.properties),
  }
  return event.eventKey
    ? admin.from("product_analytics_events").upsert(payload, { onConflict: "therapist_id,event_name,event_key", ignoreDuplicates: true })
    : admin.from("product_analytics_events").insert(payload)
}

export function isAnalyticsAdmin(userId: string) {
  const allowed = (process.env.ANALYTICS_ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}
