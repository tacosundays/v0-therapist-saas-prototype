-- ============================================================
-- HIPAA-CONSCIOUS AUDIT LOGGING
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.current_therapist_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.therapists t
  WHERE lower(t.email) = lower((auth.jwt() ->> 'email'))
  LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES public.therapists(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  actor_role text CHECK (actor_role IN ('therapist', 'client', 'system', 'unknown')),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_therapist_created_at
ON public.audit_logs(therapist_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON public.audit_logs(resource_type, resource_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "therapists can read their own audit logs" ON public.audit_logs;
CREATE POLICY "therapists can read their own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (therapist_id = public.current_therapist_id());

DROP POLICY IF EXISTS "users can read their own auth audit logs" ON public.audit_logs;
CREATE POLICY "users can read their own auth audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND resource_type = 'auth');

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;
