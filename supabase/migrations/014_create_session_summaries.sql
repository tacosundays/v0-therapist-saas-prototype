-- ============================================================
-- AI SESSION SUMMARIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  summary_json jsonb NOT NULL,
  summary_text text,
  source_counts jsonb DEFAULT '{}'::jsonb,
  model text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_therapist_client_created_at
ON public.session_summaries(therapist_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_summaries_client_created_at
ON public.session_summaries(client_id, created_at DESC);

ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Therapists can manage own session summaries"
ON public.session_summaries;

CREATE POLICY "Therapists can manage own session summaries"
ON public.session_summaries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = session_summaries.therapist_id
      AND c.id = session_summaries.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = session_summaries.therapist_id
      AND c.id = session_summaries.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_summaries TO authenticated;
