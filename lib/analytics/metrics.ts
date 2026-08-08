import type { AnalyticsEventName } from "@/lib/analytics/events"

export interface AnalyticsEventRow {
  therapist_id: string
  event_name: AnalyticsEventName
  occurred_at: string
  session_id?: string | null
}

export interface AnalyticsSummary {
  totals: { therapists: number; dau: number; wau: number; mau: number }
  activationFunnel: Array<{ event: AnalyticsEventName; label: string; therapists: number; rate: number }>
  onboarding: { started: number; completed: number; skipped: number; completionRate: number }
  adoption: { assignmentCreators: number; worksheetGenerators: number; sessionPrepUsers: number; sessionPrepCompletions: number }
  retention: Array<{ cohortWeek: string; activated: number; week1Rate: number; week4Rate: number }>
  activityTrend: Array<{ date: string; activeTherapists: number }>
}

const DAY = 86_400_000
const uniqueTherapists = (events: AnalyticsEventRow[], name: AnalyticsEventName) =>
  new Set(events.filter((event) => event.event_name === name).map((event) => event.therapist_id)).size

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function startOfUtcWeek(date: Date) {
  const day = startOfUtcDay(date)
  const weekday = new Date(day).getUTCDay()
  return day - ((weekday + 6) % 7) * DAY
}

export function aggregateAnalytics(events: AnalyticsEventRow[], now = new Date()): AnalyticsSummary {
  const nowMs = now.getTime()
  const activeEvents = events.filter((event) => event.event_name === "daily_active_therapist_session")
  const activeSince = (days: number) => new Set(
    activeEvents.filter((event) => nowMs - new Date(event.occurred_at).getTime() < days * DAY).map((event) => event.therapist_id),
  ).size
  const therapistCount = new Set(events.map((event) => event.therapist_id)).size

  const funnelDefinitions: Array<[AnalyticsEventName, string]> = [
    ["therapist_signup", "Signed up"],
    ["onboarding_completed", "Completed onboarding"],
    ["first_client_created", "Created first client"],
    ["first_assignment_sent", "Sent first assignment"],
    ["first_ai_session_prep_opened", "Opened Session Prep"],
  ]
  const funnelBase = Math.max(1, uniqueTherapists(events, "therapist_signup"))
  const activationFunnel = funnelDefinitions.map(([event, label]) => {
    const therapists = uniqueTherapists(events, event)
    return { event, label, therapists, rate: Math.round((therapists / funnelBase) * 100) }
  })

  const onboardingStarted = uniqueTherapists(events, "onboarding_started")
  const onboardingCompleted = uniqueTherapists(events, "onboarding_completed")
  const onboardingSkipped = uniqueTherapists(events, "onboarding_skipped")

  const today = startOfUtcDay(now)
  const activityTrend = Array.from({ length: 30 }, (_, index) => {
    const day = today - (29 - index) * DAY
    const date = new Date(day).toISOString().slice(0, 10)
    const activeTherapists = new Set(activeEvents.filter((event) => event.occurred_at.slice(0, 10) === date).map((event) => event.therapist_id)).size
    return { date, activeTherapists }
  })

  const signupEvents = events.filter((event) => event.event_name === "therapist_signup")
  const cohorts = new Map<number, Set<string>>()
  for (const event of signupEvents) {
    const week = startOfUtcWeek(new Date(event.occurred_at))
    const cohort = cohorts.get(week) || new Set<string>()
    cohort.add(event.therapist_id)
    cohorts.set(week, cohort)
  }
  const retention = [...cohorts.entries()].sort(([a], [b]) => a - b).slice(-12).map(([week, therapists]) => {
    const retainedAt = (weeks: number) => {
      const from = week + weeks * 7 * DAY
      const to = from + 7 * DAY
      const retained = new Set(activeEvents.filter((event) => {
        const timestamp = new Date(event.occurred_at).getTime()
        return therapists.has(event.therapist_id) && timestamp >= from && timestamp < to
      }).map((event) => event.therapist_id)).size
      return Math.round((retained / Math.max(1, therapists.size)) * 100)
    }
    return {
      cohortWeek: new Date(week).toISOString().slice(0, 10),
      activated: therapists.size,
      week1Rate: retainedAt(1),
      week4Rate: retainedAt(4),
    }
  })

  return {
    totals: { therapists: therapistCount, dau: activeSince(1), wau: activeSince(7), mau: activeSince(30) },
    activationFunnel,
    onboarding: {
      started: onboardingStarted,
      completed: onboardingCompleted,
      skipped: onboardingSkipped,
      completionRate: Math.round((onboardingCompleted / Math.max(1, onboardingStarted)) * 100),
    },
    adoption: {
      assignmentCreators: uniqueTherapists(events, "first_assignment_created"),
      worksheetGenerators: uniqueTherapists(events, "worksheet_generated"),
      sessionPrepUsers: uniqueTherapists(events, "first_ai_session_prep_opened"),
      sessionPrepCompletions: uniqueTherapists(events, "ai_session_prep_completed"),
    },
    retention,
    activityTrend,
  }
}
