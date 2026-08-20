import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  assert.deepEqual(getRouteAccessDecision("/dashboard/clients", "therapist", true), { action: "allow" })
  assert.deepEqual(getRouteAccessDecision("/client-portal", "therapist", true), {
    action: "redirect",
    destination: "/dashboard",
  })
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

test("public demo entry establishes demo mode before entering the dashboard", () => {
  const chooser = readFileSync("app/demo/page.tsx", "utf8")
  const demoMode = readFileSync("lib/demo-mode.ts", "utf8")
  const header = readFileSync("components/landing/header.tsx", "utf8")
  const sidebar = readFileSync("components/dashboard/sidebar.tsx", "utf8")
  const middleware = readFileSync("lib/supabase/middleware.ts", "utf8")
  const clientLayout = readFileSync("app/client-portal/layout.tsx", "utf8")
  const clientPage = readFileSync("app/client-portal/page.tsx", "utf8")
  assert.match(chooser, /\/dashboard\?demo=therapist/)
  assert.match(chooser, /\/client-portal\?demo=client/)
  assert.match(middleware, /startsWith\("\/client-portal"\)/)
  assert.match(middleware, /sessionsteps\.demoMode/)
  assert.match(demoMode, /document\.cookie/)
  assert.match(header, /href="\/demo"/)
  assert.match(sidebar, /isDemoMode \|\| isDemoModeEnabled\(\)/)
  assert.match(clientLayout, /params\.get\("demo"\) === "client"/)
  assert.match(clientPage, /demoAssignments/)
})

test("primary surfaces use the SessionSteps brand", () => {
  for (const path of ["app/layout.tsx", "app/login/page.tsx", "components/landing/header.tsx", "components/dashboard/sidebar.tsx"]) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /SessionSteps/, path)
    assert.doesNotMatch(source, new RegExp(["Shrink", "Aid"].join("")), path)
  }
  const mark = readFileSync("components/brand-mark.tsx", "utf8")
  const hero = readFileSync("components/landing/hero.tsx", "utf8")
  assert.match(mark, /SessionSteps logo/)
  assert.match(hero, /Clinical continuity for behavioral health/)
  assert.match(hero, /longitudinal outcomes/)
})
