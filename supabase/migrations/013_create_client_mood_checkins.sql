-- ============================================================
-- CLIENT MOOD CHECK-INS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_mood_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mood_rating integer NOT NULL CHECK (mood_rating BETWEEN 1 AND 10),
  anxiety_rating integer CHECK (anxiety_rating BETWEEN 1 AND 10),
  stress_rating integer CHECK (stress_rating BETWEEN 1 AND 10),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_mood_checkins_therapist_created_at
ON public.client_mood_checkins(therapist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_mood_checkins_client_created_at
ON public.client_mood_checkins(client_id, created_at DESC);

ALTER TABLE public.client_mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_client_mood_checkins_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_client_mood_checkins_updated_at
ON public.client_mood_checkins;

CREATE TRIGGER set_client_mood_checkins_updated_at
BEFORE UPDATE ON public.client_mood_checkins
FOR EACH ROW
EXECUTE FUNCTION public.set_client_mood_checkins_updated_at();

DROP POLICY IF EXISTS "Clients can manage own mood check-ins"
ON public.client_mood_checkins;

DROP POLICY IF EXISTS "Clients can read own mood check-ins"
ON public.client_mood_checkins;

DROP POLICY IF EXISTS "Clients can create own mood check-ins"
ON public.client_mood_checkins;

DROP POLICY IF EXISTS "Therapists can view client mood check-ins"
ON public.client_mood_checkins;

CREATE POLICY "Clients can read own mood check-ins"
ON public.client_mood_checkins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_mood_checkins.client_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can create own mood check-ins"
ON public.client_mood_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_mood_checkins.client_id
      AND c.therapist_id = client_mood_checkins.therapist_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Therapists can view client mood check-ins"
ON public.client_mood_checkins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = client_mood_checkins.therapist_id
      AND c.id = client_mood_checkins.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);
