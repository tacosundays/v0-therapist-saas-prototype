\set ON_ERROR_STOP on

-- Read-only preflight for migrations 026-028. Run as the staging database
-- owner. Any exception blocks the rehearsal before schema changes begin.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  missing text[];
  duplicate_count bigint;
BEGIN
  SELECT array_agg(required_table)
  INTO missing
  FROM unnest(ARRAY[
    'therapists', 'clients', 'practices', 'practice_members',
    'therapist_invites', 'audit_logs'
  ]) required_table
  WHERE to_regclass('public.' || required_table) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing required base tables: %', missing;
  END IF;

  IF to_regclass('public.organizations') IS NOT NULL
     OR to_regclass('public.organization_members') IS NOT NULL THEN
    RAISE EXCEPTION 'Organization tables already exist; determine migration state before continuing';
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT lower(email)
    FROM public.therapists
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% duplicate case-insensitive therapist email(s) require resolution', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT pm.therapist_id
    FROM public.practice_members pm
    WHERE pm.status = 'active'
    GROUP BY pm.therapist_id
    HAVING count(DISTINCT pm.practice_id) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% therapist(s) have active membership in multiple practices', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM public.practices p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.practice_members pm
    WHERE pm.practice_id = p.id
      AND pm.therapist_id = p.owner_therapist_id
      AND pm.role = 'owner'
      AND pm.status = 'active'
  );
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% practice owner(s) lack an active owner membership', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM public.clients c
  LEFT JOIN public.therapists t ON t.id = c.therapist_id
  WHERE t.id IS NULL;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% orphan client(s) reference missing therapists', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT stripe_customer_id
    FROM public.therapists
    WHERE stripe_customer_id IS NOT NULL
    GROUP BY stripe_customer_id
    HAVING count(*) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% duplicate Stripe customer id(s) require resolution', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM (
    SELECT stripe_subscription_id
    FROM public.therapists
    WHERE stripe_subscription_id IS NOT NULL
    GROUP BY stripe_subscription_id
    HAVING count(*) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% duplicate Stripe subscription id(s) require resolution', duplicate_count;
  END IF;

  SELECT count(*) INTO duplicate_count
  FROM public.therapists t
  JOIN public.practice_members pm
    ON pm.therapist_id = t.id
   AND pm.status = 'active'
  JOIN public.practices p ON p.id = pm.practice_id
  WHERE t.id <> p.owner_therapist_id
    AND (t.stripe_customer_id IS NOT NULL OR t.stripe_subscription_id IS NOT NULL);
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION '% non-owner practice member(s) have billing ids that require an explicit transfer decision', duplicate_count;
  END IF;
END $$;

SELECT
  (SELECT count(*) FROM public.therapists) AS therapists,
  (SELECT count(*) FROM public.clients) AS clients,
  (SELECT count(*) FROM public.practices) AS practices,
  (SELECT count(*) FROM public.practice_members WHERE status = 'active') AS active_practice_members,
  (SELECT count(*) FROM public.therapists WHERE stripe_customer_id IS NOT NULL) AS billed_therapists,
  (SELECT count(*) FROM public.therapists t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.practice_members pm
      WHERE pm.therapist_id = t.id AND pm.status = 'active'
    )) AS projected_solo_organizations;

ROLLBACK;
