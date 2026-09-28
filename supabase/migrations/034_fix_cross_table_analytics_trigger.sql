-- A trigger function shared by several tables must not read a table-specific
-- field until PostgreSQL knows which trigger table invoked it. The previous
-- single AND expression attempted to resolve NEW.status for therapist rows,
-- blocking every new therapist signup.
CREATE OR REPLACE FUNCTION public.record_product_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  analytics_therapist_id uuid;
  analytics_event_name text;
BEGIN
  IF TG_TABLE_NAME = 'therapists' THEN
    analytics_therapist_id := NEW.id;
    analytics_event_name := 'therapist_signup';
  ELSIF TG_TABLE_NAME = 'clients' AND TG_OP = 'INSERT' THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'first_client_created';
  ELSIF TG_TABLE_NAME = 'clients' AND TG_OP = 'UPDATE'
    AND OLD.invite_accepted_at IS NULL AND NEW.invite_accepted_at IS NOT NULL THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'first_client_invitation_accepted';
  ELSIF TG_TABLE_NAME = 'assignments' THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'first_assignment_created';
  ELSIF TG_TABLE_NAME = 'worksheet_assignments' THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'first_assignment_sent';
  ELSIF TG_TABLE_NAME = 'worksheet_templates' AND NEW.source_type = 'ai' THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'worksheet_generated';
  ELSIF TG_TABLE_NAME = 'session_summaries' THEN
    analytics_therapist_id := NEW.therapist_id;
    analytics_event_name := 'ai_session_prep_completed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties)
  VALUES (analytics_therapist_id, analytics_event_name, 'first', '{"source":"database"}'::jsonb)
  ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

  IF TG_TABLE_NAME = 'assignments' THEN
    IF NEW.status = 'assigned' THEN
      INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties)
      VALUES (NEW.therapist_id, 'first_assignment_sent', 'first', '{"source":"database"}'::jsonb)
      ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
