CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'idea', 'confusing', 'other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 4000),
  page_path text NOT NULL CHECK (char_length(page_path) <= 500),
  screenshot_path text,
  browser_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_feedback_metadata_size CHECK (octet_length(browser_metadata::text) <= 2048)
);

CREATE INDEX IF NOT EXISTS beta_feedback_therapist_created_idx
  ON public.beta_feedback (therapist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS beta_feedback_status_created_idx
  ON public.beta_feedback (status, created_at DESC);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can submit their own feedback"
  ON public.beta_feedback FOR INSERT TO authenticated
  WITH CHECK (
    therapist_id IN (
      SELECT id FROM public.therapists
      WHERE id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Therapists can read their own feedback"
  ON public.beta_feedback FOR SELECT TO authenticated
  USING (
    therapist_id IN (
      SELECT id FROM public.therapists
      WHERE id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email')
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feedback-screenshots', 'feedback-screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

CREATE POLICY "Therapists upload feedback screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

REVOKE UPDATE, DELETE ON public.beta_feedback FROM authenticated;

COMMENT ON TABLE public.beta_feedback IS
  'Beta feedback. Clinical content and client identifiers must not be submitted.';
