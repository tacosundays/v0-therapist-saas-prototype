-- Canonical organization invitations and membership transitions. Legacy
-- practices remain available for historical compatibility but are no longer
-- used by live team-management authorization or seat accounting.

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by_therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE RESTRICT,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'clinician' CHECK (role IN ('admin', 'clinician')),
  token_hash text NOT NULL UNIQUE,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organization_invitations_active_email_unique
ON public.organization_invitations(organization_id, lower(email))
WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX organization_invitations_organization_idx
ON public.organization_invitations(organization_id, created_at DESC);

DO $$
DECLARE
  orphan_count bigint;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM public.therapist_invites ti
  LEFT JOIN public.organizations o ON o.legacy_practice_id = ti.practice_id
  WHERE o.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION '% legacy team invitation(s) cannot be mapped to an organization', orphan_count;
  END IF;
END $$;

INSERT INTO public.organization_invitations (
  id, organization_id, invited_by_therapist_id, email, role, token_hash,
  accepted_at, revoked_at, expires_at, created_at, updated_at
)
SELECT
  ti.id,
  o.id,
  ti.invited_by_therapist_id,
  ti.email,
  'clinician',
  ti.token_hash,
  ti.accepted_at,
  ti.revoked_at,
  ti.expires_at,
  ti.created_at,
  ti.updated_at
FROM public.therapist_invites ti
JOIN public.organizations o ON o.legacy_practice_id = ti.practice_id;

CREATE TRIGGER touch_organization_invitations_updated_at
BEFORE UPDATE ON public.organization_invitations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization admins can read invitations"
ON public.organization_invitations FOR SELECT TO authenticated
USING (public.is_current_organization_billing_admin(organization_id));

CREATE POLICY "organization admins can create invitations"
ON public.organization_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.is_current_organization_billing_admin(organization_id)
  AND invited_by_therapist_id = public.current_therapist_id()
);

CREATE POLICY "organization admins can revoke invitations"
ON public.organization_invitations FOR UPDATE TO authenticated
USING (public.is_current_organization_billing_admin(organization_id))
WITH CHECK (public.is_current_organization_billing_admin(organization_id));

GRANT SELECT, INSERT, UPDATE ON public.organization_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  target_invitation_id uuid,
  target_therapist_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.organization_invitations%ROWTYPE;
  seat_limit integer;
  active_seats bigint;
  previous_organization_id uuid;
BEGIN
  SELECT * INTO invitation
  FROM public.organization_invitations
  WHERE id = target_invitation_id
  FOR UPDATE;

  IF invitation.id IS NULL
     OR invitation.accepted_at IS NOT NULL
     OR invitation.revoked_at IS NOT NULL
     OR invitation.expires_at < now() THEN
    RAISE EXCEPTION 'organization invitation is invalid or expired';
  END IF;

  SELECT max_seats INTO seat_limit
  FROM public.organizations
  WHERE id = invitation.organization_id
  FOR UPDATE;

  SELECT count(*) INTO active_seats
  FROM public.organization_members
  WHERE organization_id = invitation.organization_id
    AND status = 'active';

  IF active_seats >= seat_limit THEN
    RAISE EXCEPTION 'organization seat limit reached';
  END IF;

  SELECT organization_id INTO previous_organization_id
  FROM public.therapists
  WHERE id = target_therapist_id
  FOR UPDATE;

  UPDATE public.organization_members
  SET status = 'removed', removed_at = now(), updated_at = now()
  WHERE therapist_id = target_therapist_id
    AND status = 'active'
    AND organization_id <> invitation.organization_id;

  INSERT INTO public.organization_members (
    organization_id, therapist_id, role, status, joined_at, removed_at
  ) VALUES (
    invitation.organization_id, target_therapist_id, invitation.role, 'active', now(), NULL
  )
  ON CONFLICT (organization_id, therapist_id) DO UPDATE
  SET role = EXCLUDED.role,
      status = 'active',
      joined_at = now(),
      removed_at = NULL,
      updated_at = now();

  UPDATE public.therapists
  SET organization_id = invitation.organization_id
  WHERE id = target_therapist_id;

  UPDATE public.clients
  SET organization_id = invitation.organization_id
  WHERE therapist_id = target_therapist_id;

  DELETE FROM public.organizations o
  WHERE o.id = previous_organization_id
    AND o.id <> invitation.organization_id
    AND o.legacy_practice_id IS NULL
    AND o.stripe_customer_id IS NULL
    AND o.stripe_subscription_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = o.id AND om.status = 'active'
    );

  UPDATE public.organization_invitations
  SET accepted_at = now(), updated_at = now()
  WHERE id = invitation.id;

  RETURN invitation.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.remove_clinician_from_organization(
  target_organization_id uuid,
  target_therapist_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  solo_organization_id uuid;
  clinician_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = target_organization_id
      AND owner_therapist_id = target_therapist_id
  ) THEN
    RAISE EXCEPTION 'organization owner cannot be removed';
  END IF;

  SELECT full_name INTO clinician_name
  FROM public.therapists
  WHERE id = target_therapist_id;

  IF clinician_name IS NULL THEN
    RAISE EXCEPTION 'clinician was not found';
  END IF;

  UPDATE public.organization_members
  SET status = 'removed', removed_at = now(), updated_at = now()
  WHERE organization_id = target_organization_id
    AND therapist_id = target_therapist_id
    AND status = 'active';

  INSERT INTO public.organizations (
    name, owner_therapist_id, billing_owner_therapist_id, plan, subscription_plan, max_seats
  ) VALUES (
    clinician_name || ' Practice', target_therapist_id, target_therapist_id, 'free', 'free', 1
  ) RETURNING id INTO solo_organization_id;

  INSERT INTO public.organization_members (organization_id, therapist_id, role, status)
  VALUES (solo_organization_id, target_therapist_id, 'owner', 'active');

  UPDATE public.therapists
  SET organization_id = solo_organization_id,
      plan = 'free',
      subscription_plan = 'free'
  WHERE id = target_therapist_id;

  UPDATE public.clients
  SET organization_id = solo_organization_id
  WHERE therapist_id = target_therapist_id;

  RETURN solo_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_clinician_from_organization(uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_clinician_from_organization(uuid, uuid) TO service_role;

DROP FUNCTION IF EXISTS public.remove_clinician_from_organization(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.join_organization_for_practice(uuid, uuid);

DROP TABLE public.therapist_invites;
