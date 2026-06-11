-- ============================================================
-- HOMEWORK COMPLETION TRACKING
-- ============================================================

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS status text,
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS started_at timestamptz;

UPDATE public.assignments
SET assigned_at = created_at
WHERE assigned_at IS NULL
  AND created_at IS NOT NULL;

UPDATE public.assignments
SET status = CASE
  WHEN completed IS TRUE THEN 'completed'
  WHEN started_at IS NOT NULL THEN 'started'
  ELSE 'assigned'
END
WHERE status IS NULL;

UPDATE public.assignments
SET completed_at = COALESCE(completed_at, now())
WHERE completed IS TRUE
  AND completed_at IS NULL;

ALTER TABLE public.assignments
ALTER COLUMN status SET DEFAULT 'assigned';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignments_status_check'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
    ADD CONSTRAINT assignments_status_check
    CHECK (status IN ('assigned', 'started', 'completed'));
  END IF;
END $$;

ALTER TABLE public.worksheet_assignments
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS started_at timestamptz;

UPDATE public.worksheet_assignments
SET assigned_at = created_at
WHERE assigned_at IS NULL
  AND created_at IS NOT NULL;

UPDATE public.worksheet_assignments
SET started_at = COALESCE(started_at, created_at)
WHERE started_at IS NULL
  AND status IN ('in_progress', 'completed');

UPDATE public.worksheet_assignments
SET completed_at = COALESCE(completed_at, now())
WHERE status = 'completed'
  AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_status
ON public.assignments(status);

CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at
ON public.assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_worksheet_assignments_started_at
ON public.worksheet_assignments(started_at);
