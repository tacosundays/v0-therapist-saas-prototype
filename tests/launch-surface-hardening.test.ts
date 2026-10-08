import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { getSafeRedirectPath } from "../lib/security/safe-redirect.ts"

test("authentication callbacks only redirect to local application paths", () => {
  assert.equal(getSafeRedirectPath("/dashboard?welcome=1"), "/dashboard?welcome=1")
  assert.equal(getSafeRedirectPath("https://evil.example/phish"), "/")
  assert.equal(getSafeRedirectPath("//evil.example/phish"), "/")
  assert.equal(getSafeRedirectPath("javascript:alert(1)"), "/")
})

test("public metadata exposes canonical discovery files and valid icons", () => {
  const layout = readFileSync("app/layout.tsx", "utf8")
  assert.match(layout, /metadataBase: new URL\('https:\/\/sessionsteps\.com'\)/)
  assert.match(layout, /\/icon\.svg/)
  assert.doesNotMatch(layout, /icon-light-32x32|icon-dark-32x32|apple-icon/)
  assert.match(readFileSync("app/robots.ts", "utf8"), /sitemap\.xml/)
  assert.match(readFileSync("app/sitemap.ts", "utf8"), /https:\/\/sessionsteps\.com/)
})

test("production responses use browser security headers", () => {
  const config = readFileSync("next.config.mjs", "utf8")
  assert.match(config, /Content-Security-Policy/)
  assert.match(config, /frame-ancestors 'none'/)
  assert.match(config, /object-src 'none'/)
  assert.match(config, /Cross-Origin-Opener-Policy/)
})

test("public health response does not expose integration-by-integration configuration", () => {
  const healthRoute = readFileSync("app/api/health/route.ts", "utf8")
  assert.doesNotMatch(healthRoute, /checks: readiness\.checks/)
})
