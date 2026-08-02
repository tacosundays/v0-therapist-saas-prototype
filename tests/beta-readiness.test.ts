import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

test("feedback migration enforces ownership and private screenshot storage", () => {
  const migration = read("supabase/migrations/025_create_beta_feedback.sql")
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /Therapists can submit their own feedback/)
  assert.match(migration, /public, file_size_limit/)
  assert.match(migration, /'feedback-screenshots'[\s\S]*false/)
  assert.match(migration, /storage\.foldername\(name\)[\s\S]*\[1\] = auth\.uid/)
})

test("feedback API authenticates and limits accepted input", () => {
  const route = read("app/api/feedback/route.ts")
  assert.match(route, /authenticateAnalyticsRequest/)
  assert.match(route, /resolveTherapistId/)
  assert.match(route, /message\.length < 3/)
  assert.match(route, /message\.length > 4000/)
  assert.match(route, /const screenshotPath = null/)
  assert.match(route, /likelySensitiveIdentifier/)
})

test("admin feedback endpoint uses the existing admin allowlist", () => {
  const route = read("app/api/admin/feedback/route.ts")
  assert.match(route, /isAnalyticsAdmin/)
  assert.match(route, /Admin access required/)
  assert.doesNotMatch(route, /client.*name|reflection|diagnos/i)
})

test("dashboard has recoverable route and global error states", () => {
  assert.match(read("app/dashboard/error.tsx"), /reset/)
  assert.match(read("app/global-error.tsx"), /Try again/)
  assert.match(read("components/dashboard/page-state.tsx"), /Your data is safe/)
})
