-- ============================================================
-- THERAPIST CALENDAR CONNECTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.therapist_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google',
  provider_account_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at timestamptz,
  scopes text[] DEFAULT ARRAY[]::text[],
  generate_ai_prep_overnight boolean NOT NULL DEFAULT false,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, provider, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_therapist_calendar_connections_therapist
ON public.therapist_calendar_connections(therapist_id, provider);

CREATE OR REPLACE FUNCTION public.set_therapist_calendar_connections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_therapist_calendar_connections_updated_at
ON public.therapist_calendar_connections;

CREATE TRIGGER set_therapist_calendar_connections_updated_at
BEFORE UPDATE ON public.therapist_calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_therapist_calendar_connections_updated_at();
