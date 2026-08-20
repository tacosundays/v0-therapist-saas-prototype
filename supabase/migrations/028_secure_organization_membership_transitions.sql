-- Keep legacy practice membership and canonical organization membership in sync.

CREATE OR REPLACE FUNCTION public.remove_clinician_from_organization(
  target_organization_id uuid,
  target_practice_id uuid,
  target_therapist_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  solo_organization_id uuid;
  clinician public.therapists%ROWTYPE;
BEGIN
  SELECT * INTO clinician FROM public.therapists WHERE id = target_therapist_id FOR UPDATE;
  IF clinician.id IS NULL OR clinician.organization_id <> target_organization_id THEN
    RAISE EXCEPTION 'clinician is not an active member of the organization';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = target_organization_id AND owner_therapist_id = target_therapist_id
  ) THEN
    RAISE EXCEPTION 'organization owner cannot be removed';
  END IF;

  UPDATE public.organization_members
  SET status = 'removed', removed_at = now(), updated_at = now()
  WHERE organization_id = target_organization_id
    AND therapist_id = target_therapist_id
    AND status = 'active';

  UPDATE public.practice_members
  SET status = 'removed', removed_at = now(), updated_at = now()
  WHERE practice_id = target_practice_id
    AND therapist_id = target_therapist_id
    AND status = 'active';

  INSERT INTO public.organizations (
    name, owner_therapist_id, billing_owner_therapist_id, plan, max_seats
  ) VALUES (
    COALESCE(NULLIF(clinician.practice_name, ''), NULLIF(clinician.full_name, '') || ' Practice', 'My Practice'),
    clinician.id, clinician.id, 'free', 1
  ) RETURNING id INTO solo_organization_id;

  UPDATE public.therapists
  SET organization_id = solo_organization_id, plan = 'free'
  WHERE id = target_therapist_id;

  INSERT INTO public.organization_members (organization_id, therapist_id, role)
  VALUES (solo_organization_id, target_therapist_id, 'owner');

  UPDATE public.clients
  SET organization_id = solo_organization_id
  WHERE therapist_id = target_therapist_id;

  RETURN solo_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_clinician_from_organization(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_clinician_from_organization(uuid, uuid, uuid) TO service_role;
