import { NextResponse } from "next/server"
import { authenticateAnalyticsRequest, isAnalyticsAdmin } from "@/lib/analytics/server"
import {
  buildBetaDashboardSummary,
  type AssignmentMetricRow,
  type BetaAnalyticsEventRow,
  type BetaDateRange,
  type BetaFeedbackMetricRow,
  type DatedRow,
} from "@/lib/analytics/beta-dashboard"

const ranges = new Set<BetaDateRange>(["7d", "30d", "90d", "all"])

export async function GET(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAnalyticsAdmin(authenticated.user.id)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const requestedRange = new URL(request.url).searchParams.get("range") || "30d"
  if (!ranges.has(requestedRange as BetaDateRange)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  }

  const [therapists, clients, assignments, worksheetAssignments, events, feedback] = await Promise.all([
    authenticated.admin.from("therapists").select("created_at").order("created_at", { ascending: true }).limit(100_000),
    authenticated.admin.from("clients").select("created_at").order("created_at", { ascending: true }).limit(100_000),
    authenticated.admin.from("assignments").select("created_at, completed, status, completed_at").order("created_at", { ascending: true }).limit(100_000),
    authenticated.admin.from("worksheet_assignments").select("created_at, status, completed_at").order("created_at", { ascending: true }).limit(100_000),
    authenticated.admin.from("product_analytics_events").select("therapist_id, event_name, occurred_at").order("occurred_at", { ascending: true }).limit(100_000),
    authenticated.admin.from("beta_feedback").select("category, status, page_path, created_at").order("created_at", { ascending: false }).limit(10_000),
  ])

  const queryError = [therapists, clients, assignments, worksheetAssignments, events, feedback].find((result) => result.error)?.error
  if (queryError) return NextResponse.json({ error: "Beta metrics could not be loaded" }, { status: 500 })

  const summary = buildBetaDashboardSummary({
    range: requestedRange as BetaDateRange,
    therapists: (therapists.data || []) as DatedRow[],
    clients: (clients.data || []) as DatedRow[],
    assignments: (assignments.data || []) as AssignmentMetricRow[],
    worksheetAssignments: (worksheetAssignments.data || []) as AssignmentMetricRow[],
    events: (events.data || []) as BetaAnalyticsEventRow[],
    feedback: (feedback.data || []) as BetaFeedbackMetricRow[],
  })

  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
