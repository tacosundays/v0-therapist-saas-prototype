-- Persist the production Security Advisor remediations applied on 2026-08-03.

-- Public buckets do not need a broad SELECT policy for public object URLs.
-- Removing it prevents anonymous callers from listing every avatar object.
DROP POLICY IF EXISTS "Public can read therapist avatars" ON storage.objects;

-- Pin trigger-function resolution to trusted schemas.
ALTER FUNCTION public.set_client_mood_checkins_updated_at()
SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_session_prep_notes_updated_at()
SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_progress_notes_updated_at()
SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_updated_at()
SET search_path = pg_catalog, public;

-- This helper only reads the caller's JWT and does not require definer rights.
ALTER FUNCTION public.current_auth_email() SECURITY INVOKER;

-- RLS helper functions must remain callable by authenticated users, but not by
-- anonymous callers. Revoke PUBLIC first because PostgreSQL grants function
-- execution to PUBLIC by default.
REVOKE EXECUTE ON FUNCTION public.current_auth_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_auth_email() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_client_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_therapist_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_current_therapist_for_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_therapist_for_client(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_practice_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_practice_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_practice_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_practice_owner(uuid) TO authenticated;

-- verify_client_invite(text, text) intentionally remains executable before
-- authentication because the client invitation signup flow requires it.
