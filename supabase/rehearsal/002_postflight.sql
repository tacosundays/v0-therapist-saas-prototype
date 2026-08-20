\set ON_ERROR_STOP on

-- Post-migration invariants. A successful rehearsal must finish with zero
-- violations and one active organization membership per clinician.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  violation_count bigint;
BEGIN
  IF to_regclass('public.organizations') IS NULL
     OR to_regclass('public.organization_members') IS NULL THEN
    RAISE EXCEPTION 'Organization migrations were not applied';
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.therapists
  WHERE organization_id IS NULL;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% therapist(s) have no organization', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM (
    SELECT t.id
    FROM public.therapists t
    LEFT JOIN public.organization_members om
      ON om.therapist_id = t.id AND om.status = 'active'
    GROUP BY t.id
    HAVING count(om.id) <> 1
  ) invalid;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% therapist(s) do not have exactly one active organization membership', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.therapists t
  JOIN public.organization_members om
    ON om.therapist_id = t.id AND om.status = 'active'
  WHERE om.organization_id <> t.organization_id;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% therapist organization pointer(s) disagree with membership', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.clients c
  JOIN public.therapists t ON t.id = c.therapist_id
  WHERE c.organization_id <> t.organization_id;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% client tenant assignment(s) disagree with clinician tenant', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.practices p
  LEFT JOIN public.organizations o ON o.legacy_practice_id = p.id
  WHERE o.id IS NULL;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% legacy practice(s) were not mapped to organizations', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.organizations
  WHERE billing_owner_therapist_id IS NULL;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% organization(s) have no billing owner', violation_count;
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM public.organizations) AS organizations,
  (SELECT count(*) FROM public.organization_members WHERE status = 'active') AS active_memberships,
  (SELECT count(*) FROM public.clients WHERE organization_id IS NOT NULL) AS tenant_scoped_clients,
  (SELECT count(*) FROM public.organizations WHERE stripe_customer_id IS NOT NULL) AS billed_organizations;

ROLLBACK;
