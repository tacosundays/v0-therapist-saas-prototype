\set ON_ERROR_STOP on

-- Uses two existing, auth-linked clinicians with clients in different tenants.
-- All attempted writes are rolled back.
BEGIN;

CREATE TEMP TABLE tenant_rehearsal_fixture AS
SELECT
  actor.auth_user_id AS actor_user_id,
  actor.email AS actor_email,
  actor.id AS actor_therapist_id,
  actor.organization_id AS actor_organization_id,
  own_client.id AS own_client_id,
  foreign_client.id AS foreign_client_id
FROM public.therapists actor
JOIN public.clients own_client ON own_client.therapist_id = actor.id
JOIN public.clients foreign_client ON foreign_client.organization_id <> actor.organization_id
WHERE actor.auth_user_id IS NOT NULL
LIMIT 1;

GRANT SELECT ON tenant_rehearsal_fixture TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenant_rehearsal_fixture) THEN
    RAISE EXCEPTION 'RLS rehearsal requires two organizations, an auth-linked clinician, and clients in both tenants';
  END IF;
END $$;

SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', actor_user_id,
    'email', actor_email,
    'role', 'authenticated'
  )::text,
  true
)
FROM tenant_rehearsal_fixture;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  fixture record;
  affected integer;
BEGIN
  SELECT * INTO fixture FROM tenant_rehearsal_fixture;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = fixture.own_client_id) THEN
    RAISE EXCEPTION 'Actor cannot read their assigned client';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clients WHERE id = fixture.foreign_client_id) THEN
    RAISE EXCEPTION 'Cross-tenant client read was allowed';
  END IF;

  UPDATE public.clients SET full_name = full_name WHERE id = fixture.foreign_client_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'Cross-tenant client update affected % row(s)', affected;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id <> fixture.actor_organization_id
  ) THEN
    RAISE EXCEPTION 'Cross-tenant organization read was allowed';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
