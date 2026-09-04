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

test("public demo entry remains separate from protected product routes", () => {
  const chooser = readFileSync("app/demo/page.tsx", "utf8")
  const header = readFileSync("components/landing/header.tsx", "utf8")
  const middleware = readFileSync("lib/supabase/middleware.ts", "utf8")
  assert.match(chooser, /\/demo\/therapist/)
  assert.match(chooser, /\/demo\/client/)
  assert.doesNotMatch(chooser, /\/dashboard\?demo=/)
  assert.match(middleware, /startsWith\("\/client-portal"\)/)
  assert.match(middleware, /sessionsteps\.demoMode/)
  assert.match(header, /href="\/demo"/)
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

test("public demo routes bypass Supabase initialization", () => {
  const middleware = readFileSync("lib/supabase/middleware.ts", "utf8")
  const publicDemoReturn = middleware.indexOf("if (isPublicDemoRoute) return response")
  const supabaseInitialization = middleware.indexOf("const supabase = createServerClient")

  assert.ok(publicDemoReturn > -1)
  assert.ok(supabaseInitialization > publicDemoReturn)
  assert.match(middleware, /pathname === "\/demo".*startsWith\("\/demo\/"\)/)
})
