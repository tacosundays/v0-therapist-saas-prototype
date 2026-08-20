-- Preserve append-only audit content while allowing ON DELETE SET NULL foreign
-- keys to detach deleted clinicians and auth users from historical events.

CREATE OR REPLACE FUNCTION public.reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs_are_append_only';
  END IF;

  IF (to_jsonb(NEW) - ARRAY['therapist_id', 'user_id'])
       IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['therapist_id', 'user_id'])
     OR NOT (
       NEW.therapist_id IS NOT DISTINCT FROM OLD.therapist_id
       OR (OLD.therapist_id IS NOT NULL AND NEW.therapist_id IS NULL)
     )
     OR NOT (
       NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       OR (OLD.user_id IS NOT NULL AND NEW.user_id IS NULL)
     ) THEN
    RAISE EXCEPTION 'audit_logs_are_append_only';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_mutation();

REVOKE ALL ON FUNCTION public.reject_audit_log_mutation() FROM PUBLIC, anon, authenticated;
