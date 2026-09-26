import assert from "node:assert/strict"
import test from "node:test"

import { formatSubscriptionPlanLabel } from "../lib/subscription-display.ts"

test("trialing accounts show Trial even when their stored plan is free", () => {
  assert.equal(formatSubscriptionPlanLabel("free", "trialing"), "Trial")
})

test("trial accounts show Trial without a stored plan", () => {
  assert.equal(formatSubscriptionPlanLabel(null, "trial"), "Trial")
})

test("active paid plans retain their product label", () => {
  assert.equal(formatSubscriptionPlanLabel("solo", "active"), "Solo")
  assert.equal(formatSubscriptionPlanLabel("group-practice", "active"), "Group Practice")
})

test("missing plan and non-trial status has no label", () => {
  assert.equal(formatSubscriptionPlanLabel(null, "active"), null)
})
