-- ============================================================
-- TENANT ISOLATION RLS REPAIR
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_therapist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.therapists t
  WHERE lower(t.email) = lower(auth.jwt() ->> 'email')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.clients c
  WHERE c.user_id = auth.uid()
     OR (
       c.user_id IS NULL
       AND lower(c.email) = lower(auth.jwt() ->> 'email')
     )
  ORDER BY c.user_id IS NULL, c.created_at DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_current_therapist_for_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = target_client_id
      AND c.therapist_id = public.current_therapist_id()
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_therapist_for_client(uuid) TO authenticated;

DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'clients',
    'assignments',
    'worksheet_assignments',
    'worksheet_responses',
    'worksheet_templates',
    'worksheet_questions',
    'custom_worksheets'
  ]
  LOOP
    FOR policy_record IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
        AND (
          qual ILIKE '%auth.uid() = therapist_id%'
          OR qual ILIKE '%auth.uid() = client_id%'
          OR with_check ILIKE '%auth.uid() = therapist_id%'
          OR with_check ILIKE '%auth.uid() = client_id%'
          OR qual ILIKE '%therapist_id = auth.uid()%'
          OR qual ILIKE '%client_id = auth.uid()%'
          OR with_check ILIKE '%therapist_id = auth.uid()%'
          OR with_check ILIKE '%client_id = auth.uid()%'
        )
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON %I.%I',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename
      );
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_worksheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Therapists can manage own clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can read own client record" ON public.clients;

CREATE POLICY "Therapists can manage own clients"
ON public.clients
FOR ALL
TO authenticated
USING (therapist_id = public.current_therapist_id())
WITH CHECK (therapist_id = public.current_therapist_id());

CREATE POLICY "Clients can read own client record"
ON public.clients
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    user_id IS NULL
    AND lower(email) = lower(auth.jwt() ->> 'email')
  )
);

DROP POLICY IF EXISTS "Therapists can manage own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Clients can read own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Clients can update own assignments" ON public.assignments;

CREATE POLICY "Therapists can manage own assignments"
ON public.assignments
FOR ALL
TO authenticated
USING (
  therapist_id = public.current_therapist_id()
  AND public.is_current_therapist_for_client(client_id)
)
WITH CHECK (
  therapist_id = public.current_therapist_id()
  AND public.is_current_therapist_for_client(client_id)
);

CREATE POLICY "Clients can read own assignments"
ON public.assignments
FOR SELECT
TO authenticated
USING (client_id = public.current_client_id());

CREATE POLICY "Clients can update own assignments"
ON public.assignments
FOR UPDATE
TO authenticated
USING (client_id = public.current_client_id())
WITH CHECK (client_id = public.current_client_id());

DROP POLICY IF EXISTS "Therapists can manage own templates" ON public.worksheet_templates;

CREATE POLICY "Therapists can manage own templates"
ON public.worksheet_templates
FOR ALL
TO authenticated
USING (therapist_id = public.current_therapist_id())
WITH CHECK (therapist_id = public.current_therapist_id());

DROP POLICY IF EXISTS "Therapists can manage questions for own templates" ON public.worksheet_questions;
DROP POLICY IF EXISTS "Clients can read questions for assigned worksheets" ON public.worksheet_questions;

CREATE POLICY "Therapists can manage questions for own templates"
ON public.worksheet_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.worksheet_templates wt
    WHERE wt.id = worksheet_questions.worksheet_template_id
      AND wt.therapist_id = public.current_therapist_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.worksheet_templates wt
    WHERE wt.id = worksheet_questions.worksheet_template_id
      AND wt.therapist_id = public.current_therapist_id()
  )
);

CREATE POLICY "Clients can read questions for assigned worksheets"
ON public.worksheet_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.worksheet_assignments wa
    WHERE wa.worksheet_template_id = worksheet_questions.worksheet_template_id
      AND wa.client_id = public.current_client_id()
  )
);

DROP POLICY IF EXISTS "Therapists can manage assignments" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Clients can view own assignments" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Clients can update own assignment status" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Therapists can manage worksheet assignments" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Clients can view own worksheet assignments" ON public.worksheet_assignments;
DROP POLICY IF EXISTS "Clients can update own worksheet assignments" ON public.worksheet_assignments;

CREATE POLICY "Therapists can manage worksheet assignments"
ON public.worksheet_assignments
FOR ALL
TO authenticated
USING (
  therapist_id = public.current_therapist_id()
  AND public.is_current_therapist_for_client(client_id)
)
WITH CHECK (
  therapist_id = public.current_therapist_id()
  AND public.is_current_therapist_for_client(client_id)
);

CREATE POLICY "Clients can view own worksheet assignments"
ON public.worksheet_assignments
FOR SELECT
TO authenticated
USING (client_id = public.current_client_id());

CREATE POLICY "Clients can update own worksheet assignments"
ON public.worksheet_assignments
FOR UPDATE
TO authenticated
USING (client_id = public.current_client_id())
WITH CHECK (client_id = public.current_client_id());

DROP POLICY IF EXISTS "Clients can manage own responses" ON public.worksheet_responses;
DROP POLICY IF EXISTS "Therapists can view responses for their assignments" ON public.worksheet_responses;
DROP POLICY IF EXISTS "Clients can manage own worksheet responses" ON public.worksheet_responses;
DROP POLICY IF EXISTS "Therapists can view worksheet responses for own clients" ON public.worksheet_responses;

CREATE POLICY "Clients can manage own worksheet responses"
ON public.worksheet_responses
FOR ALL
TO authenticated
USING (
  client_id = public.current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.worksheet_assignments wa
    WHERE wa.id = worksheet_responses.assignment_id
      AND wa.client_id = public.current_client_id()
  )
)
WITH CHECK (
  client_id = public.current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.worksheet_assignments wa
    WHERE wa.id = worksheet_responses.assignment_id
      AND wa.client_id = public.current_client_id()
  )
);

CREATE POLICY "Therapists can view worksheet responses for own clients"
ON public.worksheet_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.worksheet_assignments wa
    WHERE wa.id = worksheet_responses.assignment_id
      AND wa.therapist_id = public.current_therapist_id()
      AND public.is_current_therapist_for_client(wa.client_id)
  )
);

DROP POLICY IF EXISTS "Therapists can view own worksheets" ON public.custom_worksheets;
DROP POLICY IF EXISTS "Therapists can insert own worksheets" ON public.custom_worksheets;
DROP POLICY IF EXISTS "Therapists can update own worksheets" ON public.custom_worksheets;
DROP POLICY IF EXISTS "Therapists can delete own worksheets" ON public.custom_worksheets;
DROP POLICY IF EXISTS "Therapists can manage own custom worksheets" ON public.custom_worksheets;

CREATE POLICY "Therapists can manage own custom worksheets"
ON public.custom_worksheets
FOR ALL
TO authenticated
USING (therapist_id = public.current_therapist_id())
WITH CHECK (therapist_id = public.current_therapist_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheet_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheet_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheet_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worksheet_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_worksheets TO authenticated;
