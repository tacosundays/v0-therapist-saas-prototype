-- ============================================================
-- STRIPE BILLING V1 FIELD CLEANUP
-- ============================================================

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'therapists'
      AND column_name = 'subscription_plan'
  ) THEN
    UPDATE public.therapists
    SET plan = CASE
      WHEN subscription_plan = 'solo' THEN 'solo-practice'
      WHEN subscription_plan = 'growing' THEN 'growing-practice'
      WHEN subscription_plan IN ('group', 'enterprise') THEN 'group-practice'
      ELSE COALESCE(NULLIF(subscription_plan, ''), 'free')
    END
    WHERE plan IS NULL
       OR plan = ''
       OR plan = 'free';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'therapists'
      AND column_name = 'trial_end_date'
  ) THEN
    UPDATE public.therapists
    SET trial_ends_at = trial_end_date
    WHERE trial_ends_at IS NULL
      AND trial_end_date IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'therapists'
      AND column_name = 'subscription_end_date'
  ) THEN
    UPDATE public.therapists
    SET current_period_end = subscription_end_date
    WHERE current_period_end IS NULL
      AND subscription_end_date IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.therapists
ALTER COLUMN plan SET DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_therapists_plan
ON public.therapists(plan);

CREATE INDEX IF NOT EXISTS idx_therapists_current_period_end
ON public.therapists(current_period_end);
