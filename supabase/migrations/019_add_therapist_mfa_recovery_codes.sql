-- ============================================================
-- THERAPIST MFA RECOVERY CODES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_therapist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.therapists t
  WHERE lower(t.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.therapist_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapist_mfa_recovery_codes_therapist
ON public.therapist_mfa_recovery_codes(therapist_id);

CREATE INDEX IF NOT EXISTS idx_therapist_mfa_recovery_codes_unused
ON public.therapist_mfa_recovery_codes(therapist_id, used_at)
WHERE used_at IS NULL;

ALTER TABLE public.therapist_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "therapists can read recovery code metadata" ON public.therapist_mfa_recovery_codes;
CREATE POLICY "therapists can read recovery code metadata"
ON public.therapist_mfa_recovery_codes
FOR SELECT
TO authenticated
USING (therapist_id = public.current_therapist_id());

GRANT SELECT ON public.therapist_mfa_recovery_codes TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'practices'
  ) THEN
    ALTER TABLE public.practices
    ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;
