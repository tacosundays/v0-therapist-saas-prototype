import { NextResponse } from "next/server"
import { authenticateAnalyticsRequest, resolveTherapistId, writeProductAnalyticsEvent } from "@/lib/analytics/server"
import { isAnalyticsEventName, sanitizeAnalyticsProperties } from "@/lib/analytics/events"

const clientTrackableEvents = new Set([
  "onboarding_started",
  "onboarding_completed",
  "onboarding_skipped",
  "first_ai_session_prep_opened",
  "dashboard_opened",
  "daily_active_therapist_session",
])

export async function POST(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || !isAnalyticsEventName(body.name) || !clientTrackableEvents.has(body.name)) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 })
  }
  const therapistId = await resolveTherapistId(authenticated.admin, authenticated.user)
  if (!therapistId) return NextResponse.json({ error: "Therapist account not found" }, { status: 403 })

  const sessionId = typeof body.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionId)
    ? body.sessionId
    : null
  const eventKey = typeof body.eventKey === "string" && /^[a-zA-Z0-9:_-]{1,64}$/.test(body.eventKey)
    ? body.eventKey
    : undefined
  const { error } = await writeProductAnalyticsEvent(authenticated.admin, therapistId, {
    name: body.name,
    eventKey,
    properties: sanitizeAnalyticsProperties(body.properties),
  }, sessionId)

  if (error) return NextResponse.json({ error: "Event could not be recorded" }, { status: 500 })
  return NextResponse.json({ recorded: true }, { status: 202 })
}
