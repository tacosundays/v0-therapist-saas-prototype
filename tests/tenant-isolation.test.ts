import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { resolveTenantContext } from "../lib/tenant-context.ts"

const migration = readFileSync("supabase/migrations/026_create_organization_tenant_foundation.sql", "utf8")

test("organization migration backfills solo tenants and existing practices", () => {
  assert.match(migration, /legacy_practice_id uuid UNIQUE/i)
  assert.match(migration, /FROM public\.practice_members pm/i)
  assert.match(migration, /A solo therapist is represented as a one-person organization/i)
  assert.match(migration, /ALTER TABLE public\.clients[\s\S]*ALTER COLUMN organization_id SET NOT NULL/i)
})

test("client writes cannot cross organization boundaries", () => {
  assert.match(migration, /CREATE TRIGGER enforce_client_tenant_before_write/i)
  assert.match(migration, /client organization must match therapist organization/i)
  assert.match(migration, /therapist_id = public\.current_therapist_id\(\)/i)
  assert.match(migration, /organization_id = public\.current_organization_id\(\)/i)
  assert.match(migration, /public\.is_current_organization_member\(organization_id\)/i)
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.join_organization_for_practice[\s\S]*FROM PUBLIC, anon, authenticated/i)
})

test("clinician auth prefers immutable auth user ids", () => {
  assert.match(migration, /t\.auth_user_id = auth\.uid\(\)/i)
  assert.match(migration, /therapists_auth_user_id_unique/i)
  assert.match(migration, /t\.auth_user_id IS NULL AND lower\(t\.email\)/i)
})

test("tenant context rejects inactive or mismatched membership", async () => {
  const calls: Array<{ table: string; filters: Record<string, unknown> }> = []
  const rows: Record<string, unknown> = {
    therapists: { id: "therapist-a", organization_id: "org-a", auth_user_id: "user-a" },
    organization_members: null,
  }

  const admin = {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      calls.push({ table, filters })
      const query: any = {
        select() { return query },
        eq(column: string, value: unknown) { filters[column] = value; return query },
        is(column: string, value: unknown) { filters[column] = value; return query },
        ilike(column: string, value: unknown) { filters[column] = value; return query },
        async maybeSingle() { return { data: rows[table], error: null } },
      }
      return query
    },
  }

  const context = await resolveTenantContext(admin, { id: "user-a", email: "a@example.test" })
  assert.equal(context, null)
  assert.deepEqual(calls[1].filters, {
    organization_id: "org-a",
    therapist_id: "therapist-a",
    status: "active",
  })
})

test("tenant context returns the scoped clinician membership", async () => {
  const rows: Record<string, unknown> = {
    therapists: { id: "therapist-a", organization_id: "org-a", auth_user_id: "user-a" },
    organization_members: {
      organization_id: "org-a",
      therapist_id: "therapist-a",
      role: "clinician",
      status: "active",
    },
  }
  const admin = {
    from(table: string) {
      const query: any = {
        select() { return query },
        eq() { return query },
        is() { return query },
        ilike() { return query },
        async maybeSingle() { return { data: rows[table], error: null } },
      }
      return query
    },
  }

  assert.deepEqual(await resolveTenantContext(admin, { id: "user-a" }), {
    organizationId: "org-a",
    therapistId: "therapist-a",
    role: "clinician",
  })
})
