-- ============================================================
-- CUSTOM WORKSHEETS TABLE
-- ============================================================
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- Create custom_worksheets table
CREATE TABLE IF NOT EXISTS custom_worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  file_url text,
  category text DEFAULT 'custom',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_worksheets_therapist_id 
ON custom_worksheets(therapist_id);

CREATE INDEX IF NOT EXISTS idx_custom_worksheets_category 
ON custom_worksheets(category);

-- Enable Row Level Security
ALTER TABLE custom_worksheets ENABLE ROW LEVEL SECURITY;

-- Policy: Therapists can only see their own worksheets
CREATE POLICY "Therapists can view own worksheets"
ON custom_worksheets FOR SELECT
TO authenticated
USING (auth.uid() = therapist_id);

-- Policy: Therapists can insert their own worksheets
CREATE POLICY "Therapists can insert own worksheets"
ON custom_worksheets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = therapist_id);

-- Policy: Therapists can update their own worksheets
CREATE POLICY "Therapists can update own worksheets"
ON custom_worksheets FOR UPDATE
TO authenticated
USING (auth.uid() = therapist_id)
WITH CHECK (auth.uid() = therapist_id);

-- Policy: Therapists can delete their own worksheets
CREATE POLICY "Therapists can delete own worksheets"
ON custom_worksheets FOR DELETE
TO authenticated
USING (auth.uid() = therapist_id);

-- Add comment for documentation
COMMENT ON TABLE custom_worksheets IS 'User-uploaded and AI-generated worksheets';
COMMENT ON COLUMN custom_worksheets.file_url IS 'URL for uploaded PDF/DOCX files (optional)';
COMMENT ON COLUMN custom_worksheets.content IS 'Markdown/text content for AI-generated worksheets';
