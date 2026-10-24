import assert from "node:assert/strict"
import { test } from "node:test"
import { parseClientErrorReport } from "../lib/security/client-error-report.ts"

test("accepts a valid report and strips unexpected sensitive fields", () => {
  assert.deepEqual(parseClientErrorReport({
    scope: "dashboard",
    errorName: "TypeError",
    digest: "safe_digest-123",
    message: "client name and private details",
    stack: "private stack details",
    clientName: "Private Client",
  }), {
    scope: "dashboard",
    errorName: "TypeError",
    digest: "safe_digest-123",
  })
})

test("rejects invalid scopes and non-object reports", () => {
  assert.equal(parseClientErrorReport(null), null)
  assert.equal(parseClientErrorReport("dashboard"), null)
  assert.equal(parseClientErrorReport({ scope: "billing", errorName: "Error" }), null)
})

test("normalizes unknown error names", () => {
  assert.deepEqual(parseClientErrorReport({ scope: "global", errorName: "PrivateError" }), {
    scope: "global",
    errorName: "Error",
  })
})

test("omits malformed and oversized digests", () => {
  assert.deepEqual(parseClientErrorReport({ scope: "session-prep", errorName: "Error", digest: "bad digest" }), {
    scope: "session-prep",
    errorName: "Error",
  })
  assert.deepEqual(parseClientErrorReport({ scope: "session-prep", errorName: "Error", digest: "a".repeat(129) }), {
    scope: "session-prep",
    errorName: "Error",
  })
})
