-- ============================================================
-- THERAPIST PROFILE FIELDS AND AVATAR STORAGE
-- ============================================================

ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS credentials text,
ADD COLUMN IF NOT EXISTS profile_photo_url text;

UPDATE public.therapists
SET first_name = NULLIF(split_part(btrim(full_name), ' ', 1), '')
WHERE (first_name IS NULL OR btrim(first_name) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> '';

UPDATE public.therapists
SET last_name = NULLIF(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), '')
WHERE (last_name IS NULL OR btrim(last_name) = '')
  AND full_name IS NOT NULL
  AND btrim(full_name) <> ''
  AND btrim(full_name) LIKE '% %';

UPDATE public.therapists
SET full_name = NULLIF(btrim(concat_ws(' ', NULLIF(first_name, ''), NULLIF(last_name, ''))), '')
WHERE (full_name IS NULL OR btrim(full_name) = '')
  AND (NULLIF(first_name, '') IS NOT NULL OR NULLIF(last_name, '') IS NOT NULL);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'therapist-avatars',
  'therapist-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read therapist avatars'
  ) THEN
    CREATE POLICY "Public can read therapist avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'therapist-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Therapists can upload own avatars'
  ) THEN
    CREATE POLICY "Therapists can upload own avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'therapist-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Therapists can update own avatars'
  ) THEN
    CREATE POLICY "Therapists can update own avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'therapist-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'therapist-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Therapists can delete own avatars'
  ) THEN
    CREATE POLICY "Therapists can delete own avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'therapist-avatars'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;
