-- Remove direct API execution from database functions that exist only for
-- triggers, and make the remaining RPC/RLS helper permissions explicit.

ALTER FUNCTION public.set_therapist_calendar_connections_updated_at()
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.set_therapist_calendar_connections_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_client_tenant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_solo_organization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_product_milestone() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.current_therapist_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_client_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_organization_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_organization_billing_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_current_clinician_for_client(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_organization_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_organization_billing_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_clinician_for_client(uuid) TO authenticated;

-- This narrowly scoped lookup is intentionally available before sign-in so a
-- client can validate an invitation. It returns no clinical content.
REVOKE ALL ON FUNCTION public.verify_client_invite(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_client_invite(text, text) TO anon, authenticated;
