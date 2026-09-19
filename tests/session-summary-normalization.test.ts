import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeSessionSummary } from "../lib/session-summary-normalization.ts"

const evidence = {
  assignments: 1,
  worksheetAssignments: 2,
  worksheetResponses: 4,
  reflections: 1,
  moodCheckIns: 1,
  couples: 0,
  coupleCheckIns: 0,
  progressNotes: 0,
  sessionPrepNotes: 0,
}

test("uses grounded source counts when the model omits an overview", () => {
  const result = normalizeSessionSummary({}, evidence)

  assert.match(result.clientOverview, /3 assignments/)
  assert.match(result.clientOverview, /1 reflection/)
  assert.match(result.clientOverview, /1 mood check-in/)
  assert.doesNotMatch(result.clientOverview, /No relevant data/)
})

test("preserves useful model output and normalizes lists", () => {
  const result = normalizeSessionSummary({
    clientOverview: " Client has engaged consistently. ",
    suggestedDiscussionTopics: [" Review coping plan ", "", 12],
  }, evidence)

  assert.equal(result.clientOverview, "Client has engaged consistently.")
  assert.deepEqual(result.suggestedDiscussionTopics, ["Review coping plan"])
})
