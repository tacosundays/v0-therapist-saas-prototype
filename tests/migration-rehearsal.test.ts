import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("preflight blocks ambiguous tenants, orphan clients, and duplicate billing ids", () => {
  const sql = readFileSync("supabase/rehearsal/001_preflight.sql", "utf8")
  assert.match(sql, /active membership in multiple practices/)
  assert.match(sql, /orphan client/)
  assert.match(sql, /duplicate Stripe customer/)
  assert.match(sql, /duplicate Stripe subscription/)
  assert.match(sql, /practice owner\(s\) lack an active owner membership/)
  assert.match(sql, /non-owner practice member\(s\) have billing ids/)
  assert.match(sql, /projected_solo_organizations/)
  assert.match(sql, /BEGIN TRANSACTION READ ONLY/)
})

test("postflight enforces canonical organization invariants", () => {
  const sql = readFileSync("supabase/rehearsal/002_postflight.sql", "utf8")
  assert.match(sql, /exactly one active organization membership/)
  assert.match(sql, /client tenant assignment/)
  assert.match(sql, /legacy practice/)
  assert.match(sql, /billing owner/)
})

test("RLS rehearsal impersonates an authenticated clinician and rolls back writes", () => {
  const sql = readFileSync("supabase/rehearsal/003_cross_tenant_rls.sql", "utf8")
  assert.match(sql, /SET LOCAL ROLE authenticated/)
  assert.match(sql, /Cross-tenant client read was allowed/)
  assert.match(sql, /Cross-tenant client update affected/)
  assert.match(sql, /Cross-tenant organization read was allowed/)
  assert.match(sql, /ROLLBACK/)
})
