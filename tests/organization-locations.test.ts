import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const migration = readFileSync("supabase/migrations/031_organization_administration_and_locations.sql", "utf8")
const route = readFileSync("app/api/organization/route.ts", "utf8")

test("locations are organization-owned and tenant isolated", () => {
  assert.match(migration, /CREATE TABLE public\.locations[\s\S]*organization_id uuid NOT NULL REFERENCES public\.organizations/)
  assert.match(migration, /ALTER TABLE public\.locations ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /is_current_organization_member\(organization_id\)/)
  assert.match(migration, /is_current_organization_billing_admin\(organization_id\)/)
  assert.match(migration, /FOREIGN KEY \(location_id, organization_id\) REFERENCES public\.locations\(id, organization_id\)/)
  assert.match(migration, /om\.therapist_id = location_memberships\.therapist_id/)
})

test("solo organizations receive one primary location and clinician assignment", () => {
  assert.match(migration, /INSERT INTO public\.locations \(organization_id,\s*name,\s*is_primary\)[\s\S]*'Primary Location'/)
  assert.match(migration, /INSERT INTO public\.location_memberships[\s\S]*NEW\.id,true/)
  assert.match(migration, /CREATE UNIQUE INDEX locations_one_primary_per_organization/)
  assert.match(migration, /CREATE UNIQUE INDEX location_memberships_one_primary_per_therapist/)
})

test("clients and invitations are backfilled and require a location", () => {
  assert.match(migration, /ALTER TABLE public\.clients ALTER COLUMN location_id SET NOT NULL/)
  assert.match(migration, /ALTER TABLE public\.organization_invitations ALTER COLUMN location_id SET NOT NULL/)
  assert.match(migration, /client location must be assigned to the therapist organization/)
})

test("organization transitions remove stale location access", () => {
  assert.match(migration, /DELETE FROM public\.location_memberships WHERE therapist_id=target_therapist_id AND organization_id<>invitation\.organization_id/)
  assert.match(migration, /DELETE FROM public\.location_memberships WHERE therapist_id=target_therapist_id;/)
  assert.match(migration, /FROM PUBLIC,anon,authenticated/)
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.transfer_organization_ownership/)
})

test("organization administration is scoped to resolved tenant context", () => {
  assert.match(route, /resolveTenantContext/)
  assert.match(route, /\.eq\("organization_id", tenant\.organizationId\)/)
  assert.match(route, /\["owner", "admin"\]\.includes\(tenant\.role\)/)
  assert.match(route, /tenant\.role !== "owner"/)
  assert.doesNotMatch(route, /body\.organizationId/)
})
