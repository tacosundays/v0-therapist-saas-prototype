export const ONBOARDING_STEP_COUNT = 7

export type OnboardingStatus = "not_started" | "in_progress" | "skipped" | "completed"

export type OnboardingRecord = {
  onboarding_status?: OnboardingStatus | null
  onboarding_step?: number | null
  onboarding_completed_at?: string | null
  onboarding_skipped_at?: string | null
}

export function normalizeOnboardingStep(step: number | null | undefined) {
  if (!Number.isFinite(step)) return 0
  return Math.min(ONBOARDING_STEP_COUNT - 1, Math.max(0, Math.trunc(step as number)))
}

export function shouldShowOnboarding(record: OnboardingRecord | null | undefined) {
  if (!record) return false
  return record.onboarding_status === "not_started" || record.onboarding_status === "in_progress"
}

export function getOnboardingResumeStep(record: OnboardingRecord | null | undefined) {
  return normalizeOnboardingStep(record?.onboarding_step)
}
