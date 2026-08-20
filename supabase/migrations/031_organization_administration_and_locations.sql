-- Organization administration and location hierarchy.

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX locations_one_primary_per_organization
ON public.locations(organization_id) WHERE is_primary;

CREATE TABLE public.location_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL,
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, therapist_id),
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX location_memberships_one_primary_per_therapist
ON public.location_memberships(therapist_id) WHERE is_primary;

INSERT INTO public.locations (organization_id, name, is_primary)
SELECT id, 'Primary Location', true FROM public.organizations;

INSERT INTO public.location_memberships (organization_id, location_id, therapist_id, is_primary)
SELECT om.organization_id, l.id, om.therapist_id, true
FROM public.organization_members om
JOIN public.locations l ON l.organization_id = om.organization_id AND l.is_primary
WHERE om.status = 'active';

ALTER TABLE public.clients
  ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;

UPDATE public.clients c
SET location_id = lm.location_id
FROM public.location_memberships lm
WHERE lm.therapist_id = c.therapist_id
  AND lm.organization_id = c.organization_id
  AND lm.is_primary
  AND c.location_id IS NULL;

ALTER TABLE public.clients ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE public.clients ADD CONSTRAINT clients_location_organization_fk
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;

ALTER TABLE public.organization_invitations
  ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE RESTRICT;

UPDATE public.organization_invitations oi
SET location_id = l.id
FROM public.locations l
WHERE l.organization_id = oi.organization_id
  AND l.is_primary
  AND oi.location_id IS NULL;

ALTER TABLE public.organization_invitations ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE public.organization_invitations ADD CONSTRAINT organization_invitations_location_organization_fk
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT;

CREATE INDEX locations_organization_idx ON public.locations(organization_id, status);
CREATE INDEX location_memberships_organization_idx ON public.location_memberships(organization_id, therapist_id);
CREATE INDEX clients_location_idx ON public.clients(location_id, therapist_id);

CREATE TRIGGER touch_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_location_memberships_updated_at
BEFORE UPDATE ON public.location_memberships
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization members can read locations"
ON public.locations FOR SELECT TO authenticated
USING (public.is_current_organization_member(organization_id));

CREATE POLICY "organization admins can manage locations"
ON public.locations FOR ALL TO authenticated
USING (public.is_current_organization_billing_admin(organization_id))
WITH CHECK (public.is_current_organization_billing_admin(organization_id));

CREATE POLICY "organization members can read location memberships"
ON public.location_memberships FOR SELECT TO authenticated
USING (public.is_current_organization_member(organization_id));

CREATE POLICY "organization admins can manage location memberships"
ON public.location_memberships FOR ALL TO authenticated
USING (public.is_current_organization_billing_admin(organization_id))
WITH CHECK (
  public.is_current_organization_billing_admin(organization_id)
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = location_memberships.organization_id
      AND om.therapist_id = location_memberships.therapist_id
      AND om.status = 'active'
  )
);

GRANT SELECT, INSERT, UPDATE ON public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_memberships TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_client_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinician_organization_id uuid;
  clinician_location_id uuid;
BEGIN
  SELECT organization_id INTO clinician_organization_id
  FROM public.therapists WHERE id = NEW.therapist_id;

  IF clinician_organization_id IS NULL THEN
    RAISE EXCEPTION 'client therapist must belong to an organization';
  END IF;

  IF NEW.organization_id IS NOT NULL AND NEW.organization_id <> clinician_organization_id THEN
    RAISE EXCEPTION 'client organization must match therapist organization';
  END IF;

  IF NEW.location_id IS NULL THEN
    SELECT location_id INTO clinician_location_id
    FROM public.location_memberships
    WHERE therapist_id = NEW.therapist_id
      AND organization_id = clinician_organization_id
    ORDER BY is_primary DESC, created_at ASC
    LIMIT 1;
    NEW.location_id := clinician_location_id;
  END IF;

  IF NEW.location_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.location_memberships lm
    WHERE lm.location_id = NEW.location_id
      AND lm.organization_id = clinician_organization_id
      AND lm.therapist_id = NEW.therapist_id
  ) THEN
    RAISE EXCEPTION 'client location must be assigned to the therapist organization';
  END IF;

  NEW.organization_id := clinician_organization_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_client_tenant_before_write ON public.clients;
CREATE TRIGGER enforce_client_tenant_before_write
BEFORE INSERT OR UPDATE OF therapist_id, organization_id, location_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.enforce_client_tenant();

CREATE UNIQUE INDEX organization_members_one_active_owner
ON public.organization_members(organization_id)
WHERE status = 'active' AND role = 'owner';

CREATE OR REPLACE FUNCTION public.set_organization_member_role(
  target_organization_id uuid,
  target_therapist_id uuid,
  target_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_role NOT IN ('admin', 'clinician') THEN
    RAISE EXCEPTION 'role must be admin or clinician';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND therapist_id = target_therapist_id
      AND status = 'active'
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'transfer ownership before changing the owner role';
  END IF;

  UPDATE public.organization_members
  SET role = target_role, updated_at = now()
  WHERE organization_id = target_organization_id
    AND therapist_id = target_therapist_id
    AND status = 'active';

  IF NOT FOUND THEN RAISE EXCEPTION 'active organization member was not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
  target_organization_id uuid,
  target_new_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE current_owner_id uuid;
BEGIN
  SELECT owner_therapist_id INTO current_owner_id
  FROM public.organizations
  WHERE id = target_organization_id
  FOR UPDATE;

  IF current_owner_id IS NULL THEN RAISE EXCEPTION 'organization was not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND therapist_id = target_new_owner_id
      AND status = 'active'
  ) THEN RAISE EXCEPTION 'new owner must be an active organization member'; END IF;

  UPDATE public.organization_members SET role = 'admin', updated_at = now()
  WHERE organization_id = target_organization_id AND therapist_id = current_owner_id AND status = 'active';
  UPDATE public.organization_members SET role = 'owner', updated_at = now()
  WHERE organization_id = target_organization_id AND therapist_id = target_new_owner_id AND status = 'active';
  UPDATE public.organizations
  SET owner_therapist_id = target_new_owner_id,
      billing_owner_therapist_id = target_new_owner_id,
      updated_at = now()
  WHERE id = target_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_clinician_location(
  target_organization_id uuid,
  target_location_id uuid,
  target_therapist_id uuid,
  make_primary boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = target_location_id AND organization_id = target_organization_id AND status='active')
     OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=target_organization_id AND therapist_id=target_therapist_id AND status='active') THEN
    RAISE EXCEPTION 'location and clinician must belong to the organization';
  END IF;
  IF make_primary THEN
    UPDATE public.location_memberships SET is_primary=false, updated_at=now() WHERE therapist_id=target_therapist_id AND is_primary;
  END IF;
  INSERT INTO public.location_memberships(organization_id,location_id,therapist_id,is_primary)
  VALUES(target_organization_id,target_location_id,target_therapist_id,make_primary)
  ON CONFLICT(location_id,therapist_id) DO UPDATE SET is_primary=EXCLUDED.is_primary,updated_at=now();
  IF make_primary THEN
    UPDATE public.clients SET location_id=target_location_id WHERE therapist_id=target_therapist_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_organization_member_role(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.transfer_organization_ownership(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.assign_clinician_location(uuid,uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_member_role(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_organization_ownership(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_clinician_location(uuid,uuid,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.provision_solo_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE new_organization_id uuid; new_location_id uuid;
BEGIN
  IF NEW.organization_id IS NULL THEN
    INSERT INTO public.organizations(name,owner_therapist_id,billing_owner_therapist_id,plan,max_seats)
    VALUES(COALESCE(NULLIF(NEW.practice_name,''),NULLIF(NEW.full_name,'')||' Practice','My Practice'),NEW.id,NEW.id,COALESCE(NULLIF(NEW.plan,''),NULLIF(NEW.subscription_plan,''),'free'),1)
    RETURNING id INTO new_organization_id;
    UPDATE public.therapists SET organization_id=new_organization_id,auth_user_id=CASE WHEN NEW.auth_user_id IS NULL AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.id) THEN NEW.id ELSE NEW.auth_user_id END WHERE id=NEW.id;
    INSERT INTO public.organization_members(organization_id,therapist_id,role) VALUES(new_organization_id,NEW.id,'owner');
    INSERT INTO public.locations(organization_id,name,is_primary) VALUES(new_organization_id,'Primary Location',true) RETURNING id INTO new_location_id;
    INSERT INTO public.location_memberships(organization_id,location_id,therapist_id,is_primary) VALUES(new_organization_id,new_location_id,NEW.id,true);
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(target_invitation_id uuid,target_therapist_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE invitation public.organization_invitations%ROWTYPE; seat_limit integer; active_seats bigint; previous_organization_id uuid;
BEGIN
  SELECT * INTO invitation FROM public.organization_invitations WHERE id=target_invitation_id FOR UPDATE;
  IF invitation.id IS NULL OR invitation.accepted_at IS NOT NULL OR invitation.revoked_at IS NOT NULL OR invitation.expires_at<now() THEN RAISE EXCEPTION 'organization invitation is invalid or expired'; END IF;
  SELECT max_seats INTO seat_limit FROM public.organizations WHERE id=invitation.organization_id FOR UPDATE;
  SELECT count(*) INTO active_seats FROM public.organization_members WHERE organization_id=invitation.organization_id AND status='active';
  IF active_seats>=seat_limit THEN RAISE EXCEPTION 'organization seat limit reached'; END IF;
  SELECT organization_id INTO previous_organization_id FROM public.therapists WHERE id=target_therapist_id FOR UPDATE;
  UPDATE public.organization_members SET status='removed',removed_at=now(),updated_at=now() WHERE therapist_id=target_therapist_id AND status='active' AND organization_id<>invitation.organization_id;
  INSERT INTO public.organization_members(organization_id,therapist_id,role,status,joined_at,removed_at)
  VALUES(invitation.organization_id,target_therapist_id,invitation.role,'active',now(),NULL)
  ON CONFLICT(organization_id,therapist_id) DO UPDATE SET role=EXCLUDED.role,status='active',joined_at=now(),removed_at=NULL,updated_at=now();
  UPDATE public.therapists SET organization_id=invitation.organization_id WHERE id=target_therapist_id;
  DELETE FROM public.location_memberships WHERE therapist_id=target_therapist_id AND organization_id<>invitation.organization_id;
  UPDATE public.location_memberships SET is_primary=false,updated_at=now() WHERE therapist_id=target_therapist_id AND organization_id=invitation.organization_id AND is_primary;
  INSERT INTO public.location_memberships(organization_id,location_id,therapist_id,is_primary)
  VALUES(invitation.organization_id,invitation.location_id,target_therapist_id,true)
  ON CONFLICT(location_id,therapist_id) DO UPDATE SET is_primary=true,updated_at=now();
  UPDATE public.clients SET organization_id=invitation.organization_id,location_id=invitation.location_id WHERE therapist_id=target_therapist_id;
  DELETE FROM public.organizations o WHERE o.id=previous_organization_id AND o.id<>invitation.organization_id AND o.legacy_practice_id IS NULL AND o.stripe_customer_id IS NULL AND o.stripe_subscription_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.organization_members om WHERE om.organization_id=o.id AND om.status='active');
  UPDATE public.organization_invitations SET accepted_at=now(),updated_at=now() WHERE id=invitation.id;
  RETURN invitation.organization_id;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_clinician_from_organization(target_organization_id uuid,target_therapist_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE solo_organization_id uuid; solo_location_id uuid; clinician_name text;
BEGIN
  IF EXISTS(SELECT 1 FROM public.organizations WHERE id=target_organization_id AND owner_therapist_id=target_therapist_id) THEN RAISE EXCEPTION 'organization owner cannot be removed'; END IF;
  SELECT full_name INTO clinician_name FROM public.therapists WHERE id=target_therapist_id;
  IF clinician_name IS NULL THEN RAISE EXCEPTION 'clinician was not found'; END IF;
  UPDATE public.organization_members SET status='removed',removed_at=now(),updated_at=now() WHERE organization_id=target_organization_id AND therapist_id=target_therapist_id AND status='active';
  DELETE FROM public.location_memberships WHERE therapist_id=target_therapist_id;
  INSERT INTO public.organizations(name,owner_therapist_id,billing_owner_therapist_id,plan,subscription_plan,max_seats)
  VALUES(clinician_name||' Practice',target_therapist_id,target_therapist_id,'free','free',1) RETURNING id INTO solo_organization_id;
  INSERT INTO public.organization_members(organization_id,therapist_id,role,status) VALUES(solo_organization_id,target_therapist_id,'owner','active');
  INSERT INTO public.locations(organization_id,name,is_primary) VALUES(solo_organization_id,'Primary Location',true) RETURNING id INTO solo_location_id;
  INSERT INTO public.location_memberships(organization_id,location_id,therapist_id,is_primary) VALUES(solo_organization_id,solo_location_id,target_therapist_id,true);
  UPDATE public.therapists SET organization_id=solo_organization_id,plan='free',subscription_plan='free' WHERE id=target_therapist_id;
  UPDATE public.clients SET organization_id=solo_organization_id,location_id=solo_location_id WHERE therapist_id=target_therapist_id;
  RETURN solo_organization_id;
END; $$;
