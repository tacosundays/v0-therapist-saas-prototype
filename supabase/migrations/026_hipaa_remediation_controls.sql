-- Client assignment integrity, append-only audit controls, and AAL2 beta feedback.

CREATE OR REPLACE FUNCTION public.enforce_client_assignment_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.client_id = public.current_client_id() AND public.current_therapist_id() IS NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.therapist_id IS DISTINCT FROM OLD.therapist_id
      OR NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.due_date IS DISTINCT FROM OLD.due_date
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
      OR NEW.status NOT IN ('started', 'completed')
      OR (OLD.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status)
    THEN RAISE EXCEPTION 'client_assignment_update_not_allowed'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_client_worksheet_assignment_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.client_id = public.current_client_id() AND public.current_therapist_id() IS NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.therapist_id IS DISTINCT FROM OLD.therapist_id
      OR NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.worksheet_template_id IS DISTINCT FROM OLD.worksheet_template_id
      OR NEW.due_date IS DISTINCT FROM OLD.due_date
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
      OR NEW.status NOT IN ('in_progress', 'completed')
      OR (OLD.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status)
    THEN RAISE EXCEPTION 'client_worksheet_assignment_update_not_allowed'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- These functions are invoked only by their triggers and must not be callable directly.
REVOKE EXECUTE ON FUNCTION public.enforce_client_assignment_update()
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_client_worksheet_assignment_update()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_client_assignment_update ON public.assignments;
CREATE TRIGGER enforce_client_assignment_update BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_assignment_update();
DROP TRIGGER IF EXISTS enforce_client_worksheet_assignment_update ON public.worksheet_assignments;
CREATE TRIGGER enforce_client_worksheet_assignment_update BEFORE UPDATE ON public.worksheet_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_worksheet_assignment_update();

CREATE OR REPLACE FUNCTION public.reject_audit_log_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'audit_logs_are_append_only'; END $$;
DROP TRIGGER IF EXISTS audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_mutation();
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;

DROP POLICY IF EXISTS "Therapists can submit their own feedback" ON public.beta_feedback;
DROP POLICY IF EXISTS "Therapists can read their own feedback" ON public.beta_feedback;
CREATE POLICY "AAL2 therapists can submit their own feedback" ON public.beta_feedback FOR INSERT TO authenticated
WITH CHECK (therapist_id = public.current_therapist_id() AND auth.jwt() ->> 'aal' = 'aal2');
CREATE POLICY "AAL2 therapists can read their own feedback" ON public.beta_feedback FOR SELECT TO authenticated
USING (therapist_id = public.current_therapist_id() AND auth.jwt() ->> 'aal' = 'aal2');
DROP POLICY IF EXISTS "Therapists upload feedback screenshots" ON storage.objects;
