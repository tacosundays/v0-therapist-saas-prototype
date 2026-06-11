-- ============================================================
-- THERAPIST PROGRESS NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.progress_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note_type text DEFAULT 'DAP',
  subjective text,
  objective text,
  assessment text,
  plan text,
  private_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_notes_therapist_client
ON public.progress_notes(therapist_id, client_id);

CREATE INDEX IF NOT EXISTS idx_progress_notes_client_created_at
ON public.progress_notes(client_id, created_at DESC);

ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_progress_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_progress_notes_updated_at
ON public.progress_notes;

CREATE TRIGGER set_progress_notes_updated_at
BEFORE UPDATE ON public.progress_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_progress_notes_updated_at();

DROP POLICY IF EXISTS "Therapists can manage own progress notes"
ON public.progress_notes;

CREATE POLICY "Therapists can manage own progress notes"
ON public.progress_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = progress_notes.therapist_id
      AND c.id = progress_notes.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients c ON c.therapist_id = t.id
    WHERE t.id = progress_notes.therapist_id
      AND c.id = progress_notes.client_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);
