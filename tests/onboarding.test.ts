import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  getOnboardingResumeStep,
  normalizeOnboardingStep,
  ONBOARDING_STEP_COUNT,
  shouldShowOnboarding,
} from "../lib/onboarding.ts"

test("onboarding step values are constrained to the seven-step wizard", () => {
  assert.equal(ONBOARDING_STEP_COUNT, 7)
  assert.equal(normalizeOnboardingStep(undefined), 0)
  assert.equal(normalizeOnboardingStep(-2), 0)
  assert.equal(normalizeOnboardingStep(3.8), 3)
  assert.equal(normalizeOnboardingStep(99), 6)
})

test("only unfinished onboarding automatically opens", () => {
  assert.equal(shouldShowOnboarding({ onboarding_status: "not_started" }), true)
  assert.equal(shouldShowOnboarding({ onboarding_status: "in_progress" }), true)
  assert.equal(shouldShowOnboarding({ onboarding_status: "skipped" }), false)
  assert.equal(shouldShowOnboarding({ onboarding_status: "completed" }), false)
  assert.equal(shouldShowOnboarding(null), false)
})

test("resume restores the saved step safely", () => {
  assert.equal(getOnboardingResumeStep({ onboarding_step: 4 }), 4)
  assert.equal(getOnboardingResumeStep({ onboarding_step: 20 }), 6)
})

test("dashboard guard, Settings resume, and real product actions are wired", async () => {
  const [layout, settings, onboarding] = await Promise.all([
    readFile(new URL("../app/dashboard/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"),
  ])

  assert.match(layout, /shouldShowOnboarding/)
  assert.match(settings, /Resume onboarding/)
  assert.match(settings, /Restart onboarding/)
  assert.match(onboarding, /AddClientModal/)
  assert.match(onboarding, /AssignHomeworkModal/)
  assert.match(onboarding, /session-prep/)
  assert.match(onboarding, /onboarding_status/)
})
