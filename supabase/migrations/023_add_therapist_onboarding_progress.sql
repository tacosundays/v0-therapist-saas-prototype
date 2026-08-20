-- Resumable first-run onboarding for therapist accounts.
ALTER TABLE public.therapists
  ADD COLUMN IF NOT EXISTS onboarding_status text,
  ADD COLUMN IF NOT EXISTS onboarding_step integer,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at timestamptz;

-- Do not interrupt therapists who were already using the product before this feature.
UPDATE public.therapists
SET onboarding_status = 'completed',
    onboarding_step = 6,
    onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE onboarding_status IS NULL;

ALTER TABLE public.therapists
  ALTER COLUMN onboarding_status SET DEFAULT 'not_started',
  ALTER COLUMN onboarding_status SET NOT NULL,
  ALTER COLUMN onboarding_step SET DEFAULT 0,
  ALTER COLUMN onboarding_step SET NOT NULL;

ALTER TABLE public.therapists
  DROP CONSTRAINT IF EXISTS therapists_onboarding_status_check,
  DROP CONSTRAINT IF EXISTS therapists_onboarding_step_check;

ALTER TABLE public.therapists
  ADD CONSTRAINT therapists_onboarding_status_check
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'skipped', 'completed')),
  ADD CONSTRAINT therapists_onboarding_step_check
    CHECK (onboarding_step BETWEEN 0 AND 6);

CREATE INDEX IF NOT EXISTS therapists_onboarding_status_idx
  ON public.therapists (onboarding_status);

COMMENT ON COLUMN public.therapists.onboarding_step IS
  'Zero-based index of the last onboarding step the therapist reached.';
