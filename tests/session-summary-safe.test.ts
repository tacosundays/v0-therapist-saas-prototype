import assert from "node:assert/strict"
import { test } from "node:test"
import { summaryTextList } from "../lib/session-summary-safe.ts"

test("normalizes cached session-summary discussion topics", () => {
  assert.deepEqual(summaryTextList(["Explore anxiety", "", "Review homework"]), [
    "Explore anxiety",
    "Review homework",
  ])
  assert.deepEqual(summaryTextList("Explore anxiety"), ["Explore anxiety"])
  assert.deepEqual(summaryTextList({ unexpected: "shape" }), [])
  assert.deepEqual(summaryTextList(null), [])
})
