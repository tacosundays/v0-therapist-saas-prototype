import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { createSessionSummaryFingerprint } from "../lib/session-summary-cache.ts"

test("session summary cache reuses unchanged source data across refreshes", () => {
  const source = {
    generatedAt: "2026-07-27T12:00:00.000Z",
    client: { fullName: "Test Client", status: "active" },
    assignments: [{ id: "assignment-1", status: "completed" }],
    reflections: [],
    moodCheckIns: [],
    sessionPrepNotes: [{ id: "note-1", note: "Review coping practice." }],
  }

  assert.equal(
    createSessionSummaryFingerprint(source),
    createSessionSummaryFingerprint({
      ...source,
      generatedAt: "2026-07-27T12:05:00.000Z",
    }),
  )
})

test("session summary cache invalidates when client activity or prep notes change", () => {
  const source = {
    generatedAt: "2026-07-27T12:00:00.000Z",
    client: { fullName: "Test Client", status: "active" },
    assignments: [{ id: "assignment-1", status: "assigned" }],
    reflections: [],
    moodCheckIns: [],
    sessionPrepNotes: [{ id: "note-1", note: "Initial note." }],
  }
  const original = createSessionSummaryFingerprint(source)

  assert.notEqual(
    original,
    createSessionSummaryFingerprint({
      ...source,
      assignments: [{ id: "assignment-1", status: "completed" }],
    }),
  )
  assert.notEqual(
    original,
    createSessionSummaryFingerprint({
      ...source,
      sessionPrepNotes: [{ id: "note-1", note: "Updated note." }],
    }),
  )
})

test("session prep API and page enforce therapist ownership", async () => {
  const [route, page, rls] = await Promise.all([
    readFile(new URL("../app/api/session-summary/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/clients/[id]/session-prep/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/020_tenant_isolation_repairs.sql", import.meta.url), "utf8"),
  ])

  assert.match(route, /\.eq\("therapist_id", therapist\.id\)/)
  assert.match(route, /Client record was not found for this therapist/)
  assert.match(page, /\.eq\("therapist_id", resolvedTherapistId\)/)
  assert.match(page, /This client was not found or you do not have permission/)
  assert.match(rls, /CREATE POLICY "Therapists can manage own clients"/)
})

test("AI summary context excludes direct contact and account identifiers", async () => {
  const route = await readFile(new URL("../app/api/session-summary/route.ts", import.meta.url), "utf8")
  const contextStart = route.indexOf("const context = {")
  const fingerprintStart = route.indexOf("const sourceFingerprint", contextStart)
  const contextBlock = route.slice(contextStart, fingerprintStart)

  assert.ok(contextStart >= 0)
  assert.ok(fingerprintStart > contextStart)
  assert.doesNotMatch(contextBlock, /\bemail\b/)
  assert.doesNotMatch(contextBlock, /\buser_id\b/)
  assert.doesNotMatch(contextBlock, /therapist:\s*\{/)
  assert.match(contextBlock, /sessionPrepNotes/)
})

test("session prep keeps hooks stable and provides a route error boundary", async () => {
  const [page, errorBoundary] = await Promise.all([
    readFile(new URL("../app/dashboard/clients/[id]/session-prep/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/clients/[id]/session-prep/error.tsx", import.meta.url), "utf8"),
  ])

  const sessionNoteContextHook = page.indexOf("const sessionNoteContext = useMemo")
  const loadingReturn = page.indexOf("if (isLoading)", sessionNoteContextHook)

  assert.ok(sessionNoteContextHook >= 0)
  assert.ok(loadingReturn > sessionNoteContextHook)
  assert.match(page, /This client was not found or you do not have permission/)
  assert.match(page, /optional .* data unavailable/)
  assert.match(errorBoundary, /Session prep couldn’t load/)
  assert.match(errorBoundary, /reset/)
})
