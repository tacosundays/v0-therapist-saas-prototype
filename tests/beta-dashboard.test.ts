import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildBetaDashboardSummary, safeProductArea } from "../lib/analytics/beta-dashboard.ts"

const root = resolve(import.meta.dirname, "..")
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

test("beta dashboard aggregation computes range metrics without returning raw feedback", () => {
  const summary = buildBetaDashboardSummary({
    range: "30d",
    now: new Date("2026-07-30T12:00:00Z"),
    therapists: [{ created_at: "2026-07-10T12:00:00Z" }, { created_at: "2026-01-01T12:00:00Z" }],
    clients: [{ created_at: "2026-07-15T12:00:00Z" }],
    assignments: [
      { created_at: "2026-07-20T12:00:00Z", status: "completed" },
      { created_at: "2026-07-21T12:00:00Z", status: "assigned" },
    ],
    worksheetAssignments: [{ created_at: "2026-07-22T12:00:00Z", completed_at: "2026-07-23T12:00:00Z" }],
    events: [
      { therapist_id: "t1", event_name: "daily_active_therapist_session", occurred_at: "2026-07-29T12:00:00Z" },
      { therapist_id: "t1", event_name: "first_ai_session_prep_opened", occurred_at: "2026-07-25T12:00:00Z" },
      { therapist_id: "t1", event_name: "ai_session_prep_completed", occurred_at: "2026-07-25T12:01:00Z" },
    ],
    feedback: [
      { category: "bug", status: "new", page_path: "/dashboard/clients/secret/session-prep", created_at: "2026-07-28T12:00:00Z" },
      { category: "idea", status: "reviewing", page_path: "/dashboard/clients/secret", created_at: "2026-07-27T12:00:00Z" },
    ],
  })

  assert.equal(summary.kpis.totalTherapists, 2)
  assert.equal(summary.kpis.active7d, 1)
  assert.equal(summary.kpis.assignmentsCreated, 3)
  assert.equal(summary.kpis.assignmentCompletionRate, 67)
  assert.equal(summary.kpis.sessionPrepUses, 2)
  assert.deepEqual(summary.feedback.topIssues, [{ label: "Session Prep", value: 1 }])
  assert.equal("message" in summary.feedback.recent[0], false)
  assert.deepEqual(summary.privacy, { clientIdentifiersReturned: false, clinicalTextReturned: false })
})

test("product area classification strips identifiers and query strings", () => {
  assert.equal(safeProductArea("/dashboard/clients/private-id/session-prep?client=secret"), "Session Prep")
  assert.equal(safeProductArea("/dashboard/clients/private-id"), "Clients")
  assert.equal(safeProductArea("/unknown/private-value"), "Other")
})

test("beta dashboard endpoint requires authentication and admin allowlist", () => {
  const route = read("app/api/admin/beta/route.ts")
  assert.match(route, /authenticateAnalyticsRequest/)
  assert.match(route, /isAnalyticsAdmin/)
  assert.match(route, /status: 401/)
  assert.match(route, /status: 403/)
  assert.match(route, /Cache-Control[\s\S]*private, no-store/)
})

test("beta dashboard API selects only aggregate-safe fields", () => {
  const route = read("app/api/admin/beta/route.ts")
  assert.doesNotMatch(route, /client_name|full_name|email|message|reflection|worksheet_content|notes|summary_text/)
  assert.match(route, /beta_feedback"\)\.select\("category, status, page_path, created_at"\)/)
  assert.match(route, /clients"\)\.select\("created_at"\)/)
})
