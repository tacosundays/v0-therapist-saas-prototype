import { NextResponse } from "next/server"
import { aggregateAnalytics, type AnalyticsEventRow } from "@/lib/analytics/metrics"
import { authenticateAnalyticsRequest, isAnalyticsAdmin } from "@/lib/analytics/server"

export async function GET(request: Request) {
  const authenticated = await authenticateAnalyticsRequest(request)
  if (!authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAnalyticsAdmin(authenticated.user.id)) {
    return NextResponse.json({ error: "Internal analytics access required" }, { status: 403 })
  }

  const since = new Date()
  since.setUTCFullYear(since.getUTCFullYear() - 1)
  const { data, error } = await authenticated.admin
    .from("product_analytics_events")
    .select("therapist_id, event_name, occurred_at, session_id")
    .gte("occurred_at", since.toISOString())
    .order("occurred_at", { ascending: true })
    .limit(100_000)

  if (error) return NextResponse.json({ error: "Analytics could not be loaded" }, { status: 500 })
  return NextResponse.json(aggregateAnalytics((data || []) as AnalyticsEventRow[]))
}
