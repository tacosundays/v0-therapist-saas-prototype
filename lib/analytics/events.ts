export const ANALYTICS_EVENT_NAMES = [
  "therapist_signup",
  "onboarding_started",
  "onboarding_completed",
  "onboarding_skipped",
  "first_client_created",
  "first_assignment_created",
  "first_assignment_sent",
  "first_client_invitation_accepted",
  "first_ai_session_prep_opened",
  "ai_session_prep_completed",
  "dashboard_opened",
  "worksheet_generated",
  "daily_active_therapist_session",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

export interface AnalyticsEventProperties {
  source?: "signup" | "onboarding" | "dashboard" | "session_prep" | "worksheet" | "database"
  cached?: boolean
  onboarding_step?: number
}

export interface AnalyticsEventInput {
  name: AnalyticsEventName
  properties?: AnalyticsEventProperties
  eventKey?: string
}

const eventNames = new Set<string>(ANALYTICS_EVENT_NAMES)
const propertyNames = new Set<keyof AnalyticsEventProperties>(["source", "cached", "onboarding_step"])

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && eventNames.has(value)
}

export function sanitizeAnalyticsProperties(value: unknown): AnalyticsEventProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(input).filter(([key, property]) => (
      propertyNames.has(key as keyof AnalyticsEventProperties)
      && (
        typeof property === "boolean"
        || (key === "onboarding_step" && typeof property === "number" && Number.isInteger(property) && property >= 0 && property <= 10)
        || (key === "source" && typeof property === "string" && ["signup", "onboarding", "dashboard", "session_prep", "worksheet", "database"].includes(property))
      )
    )),
  ) as AnalyticsEventProperties
}

export function dailyEventKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}
