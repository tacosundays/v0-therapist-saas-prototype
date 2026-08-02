import assert from "node:assert/strict"
import { test } from "node:test"
import { getRouteAccessDecision } from "../lib/supabase/route-access.ts"

test("unauthenticated users are redirected away from therapist dashboard routes", () => {
  assert.deepEqual(getRouteAccessDecision("/dashboard", null, false), {
    action: "redirect",
    destination: "/login",
  })
})

test("unauthenticated users are redirected away from client portal routes", () => {
  assert.deepEqual(getRouteAccessDecision("/client-portal", null, false), {
    action: "redirect",
    destination: "/login",
  })
})

test("therapists can access dashboard routes but not client portal routes", () => {
  assert.deepEqual(getRouteAccessDecision("/dashboard/clients", "therapist", true, true), { action: "allow" })
  assert.deepEqual(getRouteAccessDecision("/client-portal", "therapist", true), {
    action: "redirect",
    destination: "/dashboard",
  })
})

test("AAL1 therapists are restricted to the MFA security page", () => {
  assert.deepEqual(getRouteAccessDecision("/dashboard/clients", "therapist", true, false), {
    action: "redirect",
    destination: "/dashboard/security",
  })
  assert.deepEqual(getRouteAccessDecision("/dashboard/security", "therapist", true, false), { action: "allow" })
})

test("clients can access client portal routes but not therapist dashboard routes", () => {
  assert.deepEqual(getRouteAccessDecision("/portal", "client", true), { action: "allow" })
  assert.deepEqual(getRouteAccessDecision("/dashboard", "client", true), {
    action: "redirect",
    destination: "/client-portal",
  })
})

test("unknown or revoked account roles cannot access protected routes", () => {
  assert.deepEqual(getRouteAccessDecision("/dashboard/settings", "unknown", true), {
    action: "redirect",
    destination: "/login",
  })
  assert.deepEqual(getRouteAccessDecision("/client-portal/reflections", "unknown", true), {
    action: "redirect",
    destination: "/login",
  })
})

test("API routes remain protected by their route handlers", () => {
  assert.deepEqual(getRouteAccessDecision("/api/calendar/events", null, false), { action: "allow" })
})
