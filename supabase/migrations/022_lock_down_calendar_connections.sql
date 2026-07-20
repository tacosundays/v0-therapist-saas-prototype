-- Lock down encrypted Google Calendar OAuth token storage.
-- Server routes use the service role after authenticating the therapist request.

ALTER TABLE public.therapist_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_calendar_connections FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.therapist_calendar_connections FROM anon;
REVOKE ALL ON TABLE public.therapist_calendar_connections FROM authenticated;

COMMENT ON TABLE public.therapist_calendar_connections IS
  'Encrypted calendar OAuth tokens. Access is restricted to trusted server-side service-role flows.';

COMMENT ON COLUMN public.therapist_calendar_connections.access_token_encrypted IS
  'Encrypted Google Calendar access token ciphertext; never expose to browser clients.';

COMMENT ON COLUMN public.therapist_calendar_connections.refresh_token_encrypted IS
  'Encrypted Google Calendar refresh token ciphertext; never expose to browser clients.';
