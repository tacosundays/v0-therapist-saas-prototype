-- ============================================================
-- ORGANIZATION TENANT FOUNDATION
--
-- Every clinician belongs to exactly one organization. Existing practices are
-- mapped to organizations; every other clinician receives a solo organization.
-- Client access remains assigned-clinician-only in this first safe increment.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE RESTRICT,
  billing_owner_therapist_id uuid REFERENCES public.therapists(id) ON DELETE RESTRICT,
  legacy_practice_id uuid UNIQUE REFERENCES public.practices(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'free',
  max_seats integer NOT NULL DEFAULT 1 CHECK (max_seats > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'clinician' CHECK (role IN ('owner', 'admin', 'clinician')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, therapist_id)
);

CREATE UNIQUE INDEX organization_members_one_active_tenant_per_therapist
ON public.organization_members(therapist_id)
WHERE status = 'active';

ALTER TABLE public.therapists
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX therapists_auth_user_id_unique
ON public.therapists(auth_user_id)
WHERE auth_user_id IS NOT NULL;

-- Bind legacy therapist rows to immutable auth identities where the email match
-- is unambiguous. New therapist signups already use auth.users.id as their id.
UPDATE public.therapists t
SET auth_user_id = u.id
FROM auth.users u
WHERE t.auth_user_id IS NULL
  AND lower(t.email) = lower(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM public.therapists duplicate
    WHERE duplicate.id <> t.id AND lower(duplicate.email) = lower(t.email)
  );

UPDATE public.therapists
SET auth_user_id = id
WHERE auth_user_id IS NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = therapists.id);

-- Preserve established group-practice boundaries first.
INSERT INTO public.organizations (
  name, owner_therapist_id, billing_owner_therapist_id, legacy_practice_id, plan, max_seats, created_at, updated_at
)
SELECT p.name, p.owner_therapist_id, p.owner_therapist_id, p.id, p.plan, p.max_seats, p.created_at, p.updated_at
FROM public.practices p
ON CONFLICT (legacy_practice_id) DO NOTHING;

WITH selected_practice AS (
  SELECT DISTINCT ON (pm.therapist_id)
    pm.therapist_id,
    o.id AS organization_id
  FROM public.practice_members pm
  JOIN public.organizations o ON o.legacy_practice_id = pm.practice_id
  WHERE pm.status = 'active'
  ORDER BY pm.therapist_id, (pm.role = 'owner') DESC, pm.joined_at ASC
)
UPDATE public.therapists t
SET organization_id = selected_practice.organization_id
FROM selected_practice
WHERE t.id = selected_practice.therapist_id
  AND t.organization_id IS NULL;

-- A solo therapist is represented as a one-person organization.
INSERT INTO public.organizations (
  name, owner_therapist_id, billing_owner_therapist_id, plan, max_seats
)
SELECT
  COALESCE(NULLIF(t.practice_name, ''), NULLIF(t.full_name, '') || ' Practice', 'My Practice'),
  t.id,
  t.id,
  COALESCE(NULLIF(t.plan, ''), NULLIF(t.subscription_plan, ''), 'free'),
  1
FROM public.therapists t
WHERE t.organization_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.owner_therapist_id = t.id AND o.legacy_practice_id IS NULL
  );

UPDATE public.therapists t
SET organization_id = o.id
FROM public.organizations o
WHERE t.organization_id IS NULL
  AND o.owner_therapist_id = t.id
  AND o.legacy_practice_id IS NULL;

INSERT INTO public.organization_members (organization_id, therapist_id, role, status, joined_at, removed_at)
SELECT
  t.organization_id,
  t.id,
  CASE WHEN o.owner_therapist_id = t.id THEN 'owner' ELSE 'clinician' END,
  'active',
  COALESCE(pm.joined_at, t.created_at, now()),
  NULL
FROM public.therapists t
JOIN public.organizations o ON o.id = t.organization_id
LEFT JOIN public.practice_members pm
  ON pm.therapist_id = t.id
 AND pm.practice_id = o.legacy_practice_id
 AND pm.status = 'active'
ON CONFLICT (organization_id, therapist_id) DO UPDATE
SET status = 'active', removed_at = NULL;

-- This column remains nullable at the catalog level so the AFTER INSERT trigger
-- can create an organization that references the newly inserted therapist. The
-- trigger fills it in within the same statement; tenant policies reject NULL.

ALTER TABLE public.clients
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;

UPDATE public.clients c
SET organization_id = t.organization_id
FROM public.therapists t
WHERE t.id = c.therapist_id
  AND c.organization_id IS NULL;

ALTER TABLE public.clients
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX therapists_organization_id_idx ON public.therapists(organization_id);
CREATE INDEX clients_organization_id_idx ON public.clients(organization_id);
CREATE INDEX clients_organization_therapist_idx ON public.clients(organization_id, therapist_id);
CREATE INDEX organization_members_organization_idx ON public.organization_members(organization_id, status);

CREATE OR REPLACE FUNCTION public.current_therapist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT t.id
  FROM public.therapists t
  WHERE t.auth_user_id = auth.uid()
     OR (t.auth_user_id IS NULL AND lower(t.email) = lower(auth.jwt() ->> 'email'))
  ORDER BY (t.auth_user_id = auth.uid()) DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.organization_id
  FROM public.therapists t
  WHERE t.id = public.current_therapist_id()
$$;

CREATE OR REPLACE FUNCTION public.is_current_organization_member(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = target_organization_id
        AND om.therapist_id = public.current_therapist_id()
        AND om.status = 'active'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_current_clinician_for_client(target_client_id uuid)
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
      AND c.organization_id = public.current_organization_id()
      AND public.is_current_organization_member(c.organization_id)
  )
$$;

REVOKE ALL ON FUNCTION public.current_therapist_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_organization_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_clinician_for_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_organization_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_clinician_for_client(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_client_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinician_organization_id uuid;
BEGIN
  SELECT organization_id INTO clinician_organization_id
  FROM public.therapists
  WHERE id = NEW.therapist_id;

  IF clinician_organization_id IS NULL THEN
    RAISE EXCEPTION 'client therapist must belong to an organization';
  END IF;

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> clinician_organization_id THEN
    RAISE EXCEPTION 'client organization must match therapist organization';
  END IF;

  NEW.organization_id := clinician_organization_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_client_tenant_before_write
BEFORE INSERT OR UPDATE OF therapist_id, organization_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_tenant();

CREATE OR REPLACE FUNCTION public.provision_solo_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_organization_id uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    INSERT INTO public.organizations (name, owner_therapist_id, billing_owner_therapist_id, plan, max_seats)
    VALUES (
      COALESCE(NULLIF(NEW.practice_name, ''), NULLIF(NEW.full_name, '') || ' Practice', 'My Practice'),
      NEW.id,
      NEW.id,
      COALESCE(NULLIF(NEW.plan, ''), NULLIF(NEW.subscription_plan, ''), 'free'),
      1
    )
    RETURNING id INTO new_organization_id;

    UPDATE public.therapists
    SET organization_id = new_organization_id,
        auth_user_id = CASE
          WHEN NEW.auth_user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = NEW.id)
            THEN NEW.id
          ELSE NEW.auth_user_id
        END
    WHERE id = NEW.id;
    INSERT INTO public.organization_members (organization_id, therapist_id, role)
    VALUES (new_organization_id, NEW.id, 'owner');
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER provision_solo_organization_after_therapist_insert
AFTER INSERT ON public.therapists
FOR EACH ROW EXECUTE FUNCTION public.provision_solo_organization();

-- Service-role invitation handlers use this atomic transition rather than
-- independently updating legacy practice and organization membership state.
CREATE OR REPLACE FUNCTION public.join_organization_for_practice(
  target_therapist_id uuid,
  target_practice_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_organization_id uuid;
BEGIN
  SELECT id INTO target_organization_id
  FROM public.organizations
  WHERE legacy_practice_id = target_practice_id;

  IF target_organization_id IS NULL THEN
    RAISE EXCEPTION 'practice organization was not found';
  END IF;

  UPDATE public.organization_members
  SET status = 'removed', removed_at = now(), updated_at = now()
  WHERE therapist_id = target_therapist_id
    AND status = 'active'
    AND organization_id <> target_organization_id;

  INSERT INTO public.organization_members (organization_id, therapist_id, role, status, removed_at)
  VALUES (target_organization_id, target_therapist_id, 'clinician', 'active', NULL)
  ON CONFLICT (organization_id, therapist_id) DO UPDATE
  SET status = 'active', removed_at = NULL, updated_at = now();

  UPDATE public.therapists
  SET organization_id = target_organization_id
  WHERE id = target_therapist_id;

  -- Existing clients follow their assigned clinician during this compatibility
  -- transition. No other clinician receives access to them.
  UPDATE public.clients
  SET organization_id = target_organization_id
  WHERE therapist_id = target_therapist_id;

  RETURN target_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization_for_practice(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization_for_practice(uuid, uuid) TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization members can read their organization"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_current_organization_member(id));

CREATE POLICY "organization members can read their memberships"
ON public.organization_members FOR SELECT TO authenticated
USING (public.is_current_organization_member(organization_id));

DROP POLICY IF EXISTS "Therapists can manage own clients" ON public.clients;
CREATE POLICY "Clinicians can manage assigned clients in their organization"
ON public.clients FOR ALL TO authenticated
USING (
  therapist_id = public.current_therapist_id()
  AND organization_id = public.current_organization_id()
  AND public.is_current_organization_member(organization_id)
)
WITH CHECK (
  therapist_id = public.current_therapist_id()
  AND organization_id = public.current_organization_id()
  AND public.is_current_organization_member(organization_id)
);

GRANT SELECT ON public.organizations, public.organization_members TO authenticated;
