-- ============================================================
-- CLIENT REFLECTION JOURNAL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text,
  reflection_text text NOT NULL,
  mood_rating integer CHECK (mood_rating BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reflections_therapist_created_at
ON public.client_reflections(therapist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_reflections_client_created_at
ON public.client_reflections(client_id, created_at DESC);

ALTER TABLE public.client_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can manage own reflections"
ON public.client_reflections;

DROP POLICY IF EXISTS "Therapists can view client reflections"
ON public.client_reflections;

CREATE POLICY "Clients can manage own reflections"
ON public.client_reflections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_reflections.client_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = client_reflections.client_id
      AND c.therapist_id = client_reflections.therapist_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Therapists can view client reflections"
ON public.client_reflections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = client_reflections.therapist_id
      AND c.id = client_reflections.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);
