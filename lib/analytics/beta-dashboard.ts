import type { AnalyticsEventName } from "@/lib/analytics/events"

export type BetaDateRange = "7d" | "30d" | "90d" | "all"

export interface DatedRow {
  created_at: string
}

export interface AssignmentMetricRow extends DatedRow {
  completed?: boolean | null
  status?: string | null
  completed_at?: string | null
}

export interface BetaFeedbackMetricRow extends DatedRow {
  category: string
  status: string
  page_path: string
}

export interface BetaAnalyticsEventRow {
  therapist_id: string
  event_name: AnalyticsEventName
  occurred_at: string
}

export interface BetaDashboardSummary {
  range: BetaDateRange
  generatedAt: string
  kpis: {
    totalTherapists: number
    active7d: number
    active30d: number
    clientsCreated: number
    assignmentsCreated: number
    assignmentCompletionRate: number
    sessionPrepUses: number
    feedbackSubmitted: number
  }
  trends: {
    therapistSignups: Array<{ date: string; value: number }>
    clientCreation: Array<{ date: string; value: number }>
    assignmentCreation: Array<{ date: string; value: number }>
    sessionPrepUsage: Array<{ date: string; value: number }>
  }
  feedback: {
    byCategory: Array<{ label: string; value: number }>
    byStatus: Array<{ label: string; value: number }>
    topIssues: Array<{ label: string; value: number }>
    featureRequests: Array<{ label: string; value: number }>
    recent: Array<{ category: string; status: string; area: string; createdAt: string }>
  }
  privacy: {
    clientIdentifiersReturned: false
    clinicalTextReturned: false
  }
}

const DAY = 86_400_000

export function rangeStart(range: BetaDateRange, now = new Date()) {
  if (range === "all") return null
  return new Date(now.getTime() - Number.parseInt(range, 10) * DAY)
}

function dayKey(value: string) {
  return value.slice(0, 10)
}

function trend(rows: string[]) {
  const counts = new Map<string, number>()
  for (const value of rows) counts.set(dayKey(value), (counts.get(dayKey(value)) || 0) + 1)
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value }))
}

function countBy(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
}

export function safeProductArea(path: string) {
  const normalized = path.toLowerCase().split("?")[0]
  if (normalized.includes("/session-prep")) return "Session Prep"
  if (normalized.includes("/clients")) return "Clients"
  if (normalized.includes("/onboarding")) return "Onboarding"
  if (normalized.includes("/library") || normalized.includes("/worksheet")) return "Worksheets"
  if (normalized.includes("/assignment")) return "Assignments"
  if (normalized.includes("/billing")) return "Billing"
  if (normalized.includes("/settings")) return "Settings"
  if (normalized.includes("/calendar")) return "Calendar"
  if (normalized.includes("/dashboard")) return "Dashboard"
  return "Other"
}

export function buildBetaDashboardSummary(input: {
  range: BetaDateRange
  now?: Date
  therapists: DatedRow[]
  clients: DatedRow[]
  assignments: AssignmentMetricRow[]
  worksheetAssignments: AssignmentMetricRow[]
  events: BetaAnalyticsEventRow[]
  feedback: BetaFeedbackMetricRow[]
}): BetaDashboardSummary {
  const now = input.now || new Date()
  const start = rangeStart(input.range, now)
  const inRange = (value: string) => !start || new Date(value).getTime() >= start.getTime()
  const therapists = input.therapists.filter((row) => inRange(row.created_at))
  const clients = input.clients.filter((row) => inRange(row.created_at))
  const assignments = [...input.assignments, ...input.worksheetAssignments].filter((row) => inRange(row.created_at))
  const events = input.events.filter((row) => inRange(row.occurred_at))
  const feedback = input.feedback.filter((row) => inRange(row.created_at))
  const activeEvents = input.events.filter((row) => row.event_name === "daily_active_therapist_session")
  const activeSince = (days: number) => new Set(activeEvents
    .filter((row) => now.getTime() - new Date(row.occurred_at).getTime() < days * DAY)
    .map((row) => row.therapist_id)).size
  const completed = assignments.filter((row) => row.completed || row.status === "completed" || Boolean(row.completed_at)).length
  const sessionPrep = events.filter((row) => (
    row.event_name === "first_ai_session_prep_opened" || row.event_name === "ai_session_prep_completed"
  ))
  const feedbackArea = (row: BetaFeedbackMetricRow) => safeProductArea(row.page_path)

  return {
    range: input.range,
    generatedAt: now.toISOString(),
    kpis: {
      totalTherapists: input.therapists.length,
      active7d: activeSince(7),
      active30d: activeSince(30),
      clientsCreated: clients.length,
      assignmentsCreated: assignments.length,
      assignmentCompletionRate: Math.round((completed / Math.max(1, assignments.length)) * 100),
      sessionPrepUses: sessionPrep.length,
      feedbackSubmitted: feedback.length,
    },
    trends: {
      therapistSignups: trend(therapists.map((row) => row.created_at)),
      clientCreation: trend(clients.map((row) => row.created_at)),
      assignmentCreation: trend(assignments.map((row) => row.created_at)),
      sessionPrepUsage: trend(sessionPrep.map((row) => row.occurred_at)),
    },
    feedback: {
      byCategory: countBy(feedback.map((row) => row.category)),
      byStatus: countBy(feedback.map((row) => row.status)),
      topIssues: countBy(feedback.filter((row) => row.category === "bug" || row.category === "confusing").map(feedbackArea)).slice(0, 5),
      featureRequests: countBy(feedback.filter((row) => row.category === "idea").map(feedbackArea)).slice(0, 5),
      recent: [...feedback].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 8).map((row) => ({
        category: row.category,
        status: row.status,
        area: feedbackArea(row),
        createdAt: row.created_at,
      })),
    },
    privacy: {
      clientIdentifiersReturned: false,
      clinicalTextReturned: false,
    },
  }
}
