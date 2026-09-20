\set ON_ERROR_STOP on

-- Read-only verification for a restored Supabase project. This deliberately
-- avoids printing email addresses, names, note contents, or other PHI.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  missing text[];
  violation_count bigint;
BEGIN
  SELECT array_agg(required_table)
  INTO missing
  FROM unnest(ARRAY[
    'therapists', 'clients', 'organizations', 'organization_members',
    'worksheet_templates', 'worksheet_assignments', 'worksheet_responses',
    'client_reflections', 'client_mood_checkins', 'session_prep_notes',
    'audit_logs'
  ]) required_table
  WHERE to_regclass('public.' || required_table) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Restore is missing required tables: %', missing;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.therapists
  WHERE organization_id IS NULL;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% therapist(s) have no organization', violation_count;
  END IF;

  SELECT count(*) INTO violation_count
  FROM public.clients c
  LEFT JOIN public.therapists t ON t.id = c.therapist_id
  WHERE t.id IS NULL OR c.organization_id <> t.organization_id;
  IF violation_count > 0 THEN
    RAISE EXCEPTION '% client tenant or therapist reference violation(s)', violation_count;
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
    RAISE EXCEPTION '% therapist(s) lack exactly one active organization membership', violation_count;
  END IF;
END $$;

-- Aggregate counts are sufficient for comparison without exposing PHI.
SELECT 'therapists' AS relation, count(*) AS row_count FROM public.therapists
UNION ALL SELECT 'clients', count(*) FROM public.clients
UNION ALL SELECT 'organizations', count(*) FROM public.organizations
UNION ALL SELECT 'active_organization_members', count(*)
  FROM public.organization_members WHERE status = 'active'
UNION ALL SELECT 'worksheet_templates', count(*) FROM public.worksheet_templates
UNION ALL SELECT 'worksheet_assignments', count(*) FROM public.worksheet_assignments
UNION ALL SELECT 'worksheet_responses', count(*) FROM public.worksheet_responses
UNION ALL SELECT 'client_reflections', count(*) FROM public.client_reflections
UNION ALL SELECT 'client_mood_checkins', count(*) FROM public.client_mood_checkins
UNION ALL SELECT 'session_prep_notes', count(*) FROM public.session_prep_notes
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs
ORDER BY relation;

ROLLBACK;
