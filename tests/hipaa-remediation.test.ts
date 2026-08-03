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

test("Security Advisor hardening is reproducible from migrations", async () => {
  const sql = await readFile(new URL("../supabase/migrations/027_supabase_security_advisor_hardening.sql", import.meta.url), "utf8")
  assert.match(sql, /DROP POLICY IF EXISTS "Public can read therapist avatars"/)
  assert.match(sql, /set_client_mood_checkins_updated_at\(\)[\s\S]*SET search_path = pg_catalog, public/)
  assert.match(sql, /current_auth_email\(\) SECURITY INVOKER/)
  assert.match(sql, /current_client_id\(\) FROM PUBLIC, anon/)
  assert.match(sql, /is_practice_owner\(uuid\) TO authenticated/)
  assert.doesNotMatch(sql, /REVOKE EXECUTE ON FUNCTION public\.verify_client_invite/)
})
