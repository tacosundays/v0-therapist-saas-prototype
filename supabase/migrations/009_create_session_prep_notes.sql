-- ============================================================
-- SESSION PREP NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_prep_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_prep_notes_therapist_client
ON public.session_prep_notes(therapist_id, client_id);

ALTER TABLE public.session_prep_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_session_prep_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_session_prep_notes_updated_at
ON public.session_prep_notes;

CREATE TRIGGER set_session_prep_notes_updated_at
BEFORE UPDATE ON public.session_prep_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_session_prep_notes_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_prep_notes'
      AND policyname = 'Therapists can manage own session prep notes'
  ) THEN
    CREATE POLICY "Therapists can manage own session prep notes"
    ON public.session_prep_notes
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.therapists t
        WHERE t.id = session_prep_notes.therapist_id
          AND lower(t.email) = lower((auth.jwt() ->> 'email'))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.therapists t
        JOIN public.clients c ON c.therapist_id = t.id
        WHERE t.id = session_prep_notes.therapist_id
          AND c.id = session_prep_notes.client_id
          AND lower(t.email) = lower((auth.jwt() ->> 'email'))
      )
    );
  END IF;
END $$;
