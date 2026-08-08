import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { aggregateAnalytics, type AnalyticsEventRow } from "../lib/analytics/metrics.ts"
import { isAnalyticsEventName, sanitizeAnalyticsProperties } from "../lib/analytics/events.ts"

test("analytics event definitions reject arbitrary event names and PHI-like properties", () => {
  assert.equal(isAnalyticsEventName("dashboard_opened"), true)
  assert.equal(isAnalyticsEventName("client_note_viewed"), false)
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      source: "dashboard",
      cached: true,
      clientName: "Never store this",
      reflectionText: "Never store this either",
      onboarding_step: 3,
    }),
    { source: "dashboard", cached: true, onboarding_step: 3 },
  )
})

test("analytics aggregation computes funnel, active users, adoption, and retention", () => {
  const events: AnalyticsEventRow[] = [
    { therapist_id: "t1", event_name: "therapist_signup", occurred_at: "2026-06-01T12:00:00Z" },
    { therapist_id: "t2", event_name: "therapist_signup", occurred_at: "2026-06-01T12:00:00Z" },
    { therapist_id: "t1", event_name: "onboarding_started", occurred_at: "2026-06-01T12:01:00Z" },
    { therapist_id: "t2", event_name: "onboarding_started", occurred_at: "2026-06-01T12:01:00Z" },
    { therapist_id: "t1", event_name: "onboarding_completed", occurred_at: "2026-06-01T12:05:00Z" },
    { therapist_id: "t1", event_name: "first_client_created", occurred_at: "2026-06-01T12:10:00Z" },
    { therapist_id: "t1", event_name: "first_assignment_created", occurred_at: "2026-06-01T12:12:00Z" },
    { therapist_id: "t1", event_name: "first_assignment_sent", occurred_at: "2026-06-01T12:12:00Z" },
    { therapist_id: "t1", event_name: "first_ai_session_prep_opened", occurred_at: "2026-06-01T12:15:00Z" },
    { therapist_id: "t1", event_name: "daily_active_therapist_session", occurred_at: "2026-06-08T12:00:00Z" },
    { therapist_id: "t1", event_name: "daily_active_therapist_session", occurred_at: "2026-07-01T12:00:00Z" },
  ]
  const summary = aggregateAnalytics(events, new Date("2026-07-01T18:00:00Z"))
  assert.deepEqual(summary.totals, { therapists: 2, dau: 1, wau: 1, mau: 1 })
  assert.equal(summary.onboarding.completionRate, 50)
  assert.equal(summary.adoption.assignmentCreators, 1)
  assert.equal(summary.activationFunnel.at(-1)?.rate, 50)
  assert.equal(summary.retention[0]?.week1Rate, 50)
  assert.equal(summary.retention[0]?.week4Rate, 50)
})

test("analytics migration is server-only and explicitly constrains event payloads", () => {
  const migration = readFileSync(new URL("../supabase/migrations/024_create_product_analytics.sql", import.meta.url), "utf8")
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL .* anon, authenticated/)
  assert.match(migration, /octet_length\(properties::text\) <= 1024/)
  assert.doesNotMatch(migration, /reflection_text|session_prep_notes|mood_checkins/)
})
