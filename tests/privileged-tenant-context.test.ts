import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const tenantScopedPaths = [
  "app/actions/stripe.ts",
  "app/api/ai-copilot/route.ts",
  "app/api/audit-logs/route.ts",
  "app/api/client-invitations/create/route.ts",
  "app/api/client-invitations/resend/route.ts",
  "app/api/client-invitations/send/route.ts",
  "app/api/generate-worksheet/handler.ts",
  "app/api/mfa/recovery-codes/route.ts",
  "app/api/session-summary/route.ts",
  "app/api/team/invites/accept/route.ts",
  "app/api/team/invites/create/route.ts",
  "app/api/team/members/remove/route.ts",
  "app/api/team/route.ts",
  "lib/analytics/server.ts",
  "lib/google-calendar.ts",
]

test("authenticated service-role paths resolve canonical tenant context", () => {
  for (const path of tenantScopedPaths) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /resolveTenantContext/, `${path} must resolve organization context`)
  }
})

test("client invitation delivery scopes every client mutation to the organization", () => {
  for (const path of [
    "app/api/client-invitations/create/route.ts",
    "app/api/client-invitations/resend/route.ts",
    "app/api/client-invitations/send/route.ts",
  ]) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /\.eq\("organization_id", tenant\.organizationId\)/, path)
  }
})

test("membership removal is atomic and service-role only", () => {
  const migration = readFileSync("supabase/migrations/028_secure_organization_membership_transitions.sql", "utf8")
  const route = readFileSync("app/api/team/members/remove/route.ts", "utf8")
  assert.match(migration, /UPDATE public\.organization_members/)
  assert.match(migration, /UPDATE public\.practice_members/)
  assert.match(migration, /UPDATE public\.clients/)
  assert.match(migration, /FROM PUBLIC, anon, authenticated/)
  assert.match(route, /rpc\("remove_clinician_from_organization"/)
})

test("client-authenticated invite acceptance remains token and user bound", () => {
  const source = readFileSync("app/api/client-invitations/accept/route.ts", "utf8")
  assert.match(source, /auth\.getUser\(bearerToken\)/)
  assert.match(source, /token_hash/)
  assert.match(source, /\.eq\("id", clientId\)/)
  assert.match(source, /normalizeEmail\(user\.email\) !== normalizedEmail/)
})

test("team reads use organization state without creating legacy practices", () => {
  const source = readFileSync("app/api/team/route.ts", "utf8")
  assert.match(source, /from\("organization_members"\)/)
  assert.match(source, /legacy_practice_id/)
  assert.doesNotMatch(source, /\.from\("practices"\)[\s\S]{0,160}\.insert\(/)
  assert.doesNotMatch(source, /ensurePractice/)
})

test("audit logs allow only reference nulling during account cleanup", () => {
  const migration = readFileSync("supabase/migrations/029_allow_audit_reference_cleanup.sql", "utf8")
  assert.match(migration, /to_jsonb\(NEW\) - ARRAY\['therapist_id', 'user_id'\]/)
  assert.match(migration, /OLD\.therapist_id IS NOT NULL AND NEW\.therapist_id IS NULL/)
  assert.match(migration, /OLD\.user_id IS NOT NULL AND NEW\.user_id IS NULL/)
  assert.match(migration, /IF TG_OP = 'DELETE'/)
  assert.match(migration, /audit_logs_are_append_only/)
})
