import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { sanitizeAuditDetails } from "../lib/audit-log.ts"

test("audit details redact common PHI-bearing fields", () => {
  assert.deepEqual(sanitizeAuditDetails({ clientEmail: "x@example.com", note: "secret", status: "ok", count: 2 }), { status: "ok", count: 2 })
})

test("HIPAA migration protects assignment integrity and audit immutability", async () => {
  const sql = await readFile(new URL("../supabase/migrations/026_hipaa_remediation_controls.sql", import.meta.url), "utf8")
  assert.match(sql, /enforce_client_assignment_update/)
  assert.match(sql, /audit_logs_append_only/)
  assert.match(sql, /auth\.jwt\(\) ->> 'aal' = 'aal2'/)
})
