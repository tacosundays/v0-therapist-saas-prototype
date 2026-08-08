-- Privacy-conscious, product-level analytics. This table must never contain PHI,
-- client content, email addresses, notes, reflection text, or worksheet responses.
CREATE TABLE IF NOT EXISTS public.product_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (event_name IN (
    'therapist_signup', 'onboarding_started', 'onboarding_completed', 'onboarding_skipped',
    'first_client_created', 'first_assignment_created', 'first_assignment_sent',
    'first_client_invitation_accepted', 'first_ai_session_prep_opened',
    'ai_session_prep_completed', 'dashboard_opened', 'worksheet_generated',
    'daily_active_therapist_session'
  )),
  event_key text,
  session_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_analytics_properties_size CHECK (octet_length(properties::text) <= 1024),
  CONSTRAINT product_analytics_event_identity UNIQUE (therapist_id, event_name, event_key)
);

CREATE INDEX IF NOT EXISTS product_analytics_event_time_idx
  ON public.product_analytics_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_analytics_therapist_time_idx
  ON public.product_analytics_events (therapist_id, occurred_at DESC);

ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_analytics_events FROM anon, authenticated;

COMMENT ON TABLE public.product_analytics_events IS
  'Server-only product analytics. Contains no client PHI or clinical/session content.';

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
  IF TG_TABLE_NAME = 'assignments' AND NEW.status = 'assigned' THEN
    INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties)
    VALUES (NEW.therapist_id, 'first_assignment_sent', 'first', '{"source":"database"}'::jsonb)
    ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_therapist_signup ON public.therapists;
CREATE TRIGGER analytics_therapist_signup AFTER INSERT ON public.therapists
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();
DROP TRIGGER IF EXISTS analytics_first_client ON public.clients;
CREATE TRIGGER analytics_first_client AFTER INSERT OR UPDATE OF invite_accepted_at ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();
DROP TRIGGER IF EXISTS analytics_first_assignment ON public.assignments;
CREATE TRIGGER analytics_first_assignment AFTER INSERT ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();
DROP TRIGGER IF EXISTS analytics_first_worksheet_assignment ON public.worksheet_assignments;
CREATE TRIGGER analytics_first_worksheet_assignment AFTER INSERT ON public.worksheet_assignments
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();
DROP TRIGGER IF EXISTS analytics_worksheet_generated ON public.worksheet_templates;
CREATE TRIGGER analytics_worksheet_generated AFTER INSERT ON public.worksheet_templates
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();
DROP TRIGGER IF EXISTS analytics_session_prep_completed ON public.session_summaries;
CREATE TRIGGER analytics_session_prep_completed AFTER INSERT ON public.session_summaries
FOR EACH ROW EXECUTE FUNCTION public.record_product_milestone();

-- Establish an accurate baseline for accounts and milestones that predate this
-- migration without copying any client-level fields into analytics.
INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT id, 'therapist_signup', 'first', '{"source":"database"}'::jsonb, COALESCE(created_at, now())
FROM public.therapists
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'first_client_created', 'first', '{"source":"database"}'::jsonb, MIN(created_at)
FROM public.clients GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'first_assignment_created', 'first', '{"source":"database"}'::jsonb, MIN(created_at)
FROM public.assignments GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT id, 'onboarding_started', 'first', '{"source":"database"}'::jsonb, COALESCE(created_at, now())
FROM public.therapists WHERE onboarding_status IN ('in_progress', 'completed', 'skipped')
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT id, 'onboarding_completed', 'first', '{"source":"database"}'::jsonb, onboarding_completed_at
FROM public.therapists WHERE onboarding_completed_at IS NOT NULL
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT id, 'onboarding_skipped', 'first', '{"source":"database"}'::jsonb, onboarding_skipped_at
FROM public.therapists WHERE onboarding_skipped_at IS NOT NULL
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'first_client_invitation_accepted', 'first', '{"source":"database"}'::jsonb, MIN(invite_accepted_at)
FROM public.clients WHERE invite_accepted_at IS NOT NULL GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'first_assignment_sent', 'first', '{"source":"database"}'::jsonb, MIN(COALESCE(assigned_at, created_at))
FROM public.assignments WHERE status = 'assigned' GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'worksheet_generated', 'first', '{"source":"database"}'::jsonb, MIN(created_at)
FROM public.worksheet_templates WHERE source_type = 'ai' GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;

INSERT INTO public.product_analytics_events (therapist_id, event_name, event_key, properties, occurred_at)
SELECT therapist_id, 'ai_session_prep_completed', 'first', '{"source":"database"}'::jsonb, MIN(created_at)
FROM public.session_summaries GROUP BY therapist_id
ON CONFLICT (therapist_id, event_name, event_key) DO NOTHING;
