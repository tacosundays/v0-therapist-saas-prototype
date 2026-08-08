import assert from "node:assert/strict"
import test from "node:test"
import { scoreClientAttention } from "../lib/dashboard-attention.ts"

const baseline = {
  overdueHomeworkCount: 0,
  moodChange: null,
  latestMood: 7,
  latestAnxiety: 3,
  latestStress: 4,
  daysSinceCheckIn: 2,
  daysUntilSession: 5,
}

test("overdue homework is weighted and capped", () => {
  assert.equal(scoreClientAttention({ ...baseline, overdueHomeworkCount: 1 }).score, 25)
  assert.equal(scoreClientAttention({ ...baseline, overdueHomeworkCount: 4 }).score, 50)
})
test("worsening mood outranks a routine upcoming session", () => {
  const worsening = scoreClientAttention({ ...baseline, moodChange: -3 })
  const upcoming = scoreClientAttention({ ...baseline, daysUntilSession: 0 })
  assert.ok(worsening.score > upcoming.score)
  assert.equal(worsening.significantMoodAlert, true)
})

test("missed check-ins and same-day sessions combine into an actionable score", () => {
  const result = scoreClientAttention({
    ...baseline,
    daysSinceCheckIn: 16,
    daysUntilSession: 0,
  })
  assert.equal(result.score, 45)
  assert.deepEqual(result.reasons, ["No check-in in 16 days", "Session today"])
})

test("healthy, engaged clients without upcoming sessions do not require attention", () => {
  assert.deepEqual(scoreClientAttention(baseline), {
    score: 0,
    reasons: [],
    significantMoodAlert: false,
  })
})
