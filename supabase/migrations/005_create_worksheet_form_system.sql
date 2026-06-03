-- ============================================================
-- ONLINE FILLABLE WORKSHEET SYSTEM
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Worksheet Templates (the form structure)
CREATE TABLE IF NOT EXISTS worksheet_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'custom',
  source_type text DEFAULT 'custom' CHECK (source_type IN ('premade', 'uploaded', 'ai', 'custom')),
  source_worksheet_id uuid, -- Reference to custom_worksheets if converted from AI/uploaded
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Worksheet Questions (individual form fields)
CREATE TABLE IF NOT EXISTS worksheet_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_template_id uuid NOT NULL REFERENCES worksheet_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('short_text', 'long_text', 'scale', 'checkbox', 'multiple_choice', 'date')),
  options jsonb, -- For multiple_choice: ["option1", "option2"], for scale: {"min": 1, "max": 10, "labels": {"1": "Not at all", "10": "Extremely"}}
  required boolean DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Worksheet Assignments (therapist assigns template to client)
CREATE TABLE IF NOT EXISTS worksheet_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  worksheet_template_id uuid NOT NULL REFERENCES worksheet_templates(id) ON DELETE CASCADE,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Worksheet Responses (client answers)
CREATE TABLE IF NOT EXISTS worksheet_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES worksheet_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_json jsonb, -- For complex answers like multiple checkboxes
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_worksheet_templates_therapist ON worksheet_templates(therapist_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_questions_template ON worksheet_questions(worksheet_template_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_assignments_client ON worksheet_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_assignments_therapist ON worksheet_assignments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_worksheet_responses_assignment ON worksheet_responses(assignment_id);

-- Enable RLS
ALTER TABLE worksheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worksheet_templates
CREATE POLICY "Therapists can manage own templates" ON worksheet_templates
  FOR ALL TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

-- RLS Policies for worksheet_questions
CREATE POLICY "Therapists can manage questions for own templates" ON worksheet_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_templates 
      WHERE worksheet_templates.id = worksheet_questions.worksheet_template_id 
      AND worksheet_templates.therapist_id = auth.uid()
    )
  );

-- Allow clients to read questions for their assignments
CREATE POLICY "Clients can read questions for assigned worksheets" ON worksheet_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      JOIN worksheet_templates wt ON wt.id = wa.worksheet_template_id
      WHERE wt.id = worksheet_questions.worksheet_template_id
      AND wa.client_id = auth.uid()
    )
  );

-- RLS Policies for worksheet_assignments
CREATE POLICY "Therapists can manage assignments" ON worksheet_assignments
  FOR ALL TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Clients can view own assignments" ON worksheet_assignments
  FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can update own assignment status" ON worksheet_assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- RLS Policies for worksheet_responses
CREATE POLICY "Clients can manage own responses" ON worksheet_responses
  FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Therapists can view responses for their assignments" ON worksheet_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      WHERE wa.id = worksheet_responses.assignment_id
      AND wa.therapist_id = auth.uid()
    )
  );
