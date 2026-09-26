import assert from "node:assert/strict"
import test from "node:test"

import { CANONICAL_APP_URL, getAppBaseUrl } from "../lib/app-url.ts"

test("production deployments always use the canonical domain", () => {
  assert.equal(
    getAppBaseUrl({
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://old-preview.vercel.app",
    }),
    CANONICAL_APP_URL,
  )
})

test("preview deployments use their Vercel URL", () => {
  assert.equal(
    getAppBaseUrl({ VERCEL_ENV: "preview", VERCEL_URL: "preview.example.vercel.app" }),
    "https://preview.example.vercel.app",
  )
})

test("configured development URLs are normalized to their origin", () => {
  assert.equal(
    getAppBaseUrl({ NEXT_PUBLIC_APP_URL: "http://localhost:4000/some/path/" }),
    "http://localhost:4000",
  )
})

test("local development falls back to localhost", () => {
  assert.equal(getAppBaseUrl({ NODE_ENV: "development" }), "http://localhost:3000")
})
