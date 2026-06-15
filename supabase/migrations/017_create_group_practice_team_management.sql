-- ============================================================
-- GROUP PRACTICE TEAM MANAGEMENT V1
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

CREATE TABLE IF NOT EXISTS public.practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  name text NOT NULL,
  plan text NOT NULL DEFAULT 'group-practice',
  max_seats integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.practice_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'therapist' CHECK (role IN ('owner', 'therapist')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_id, therapist_id)
);

CREATE TABLE IF NOT EXISTS public.therapist_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  invited_by_therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'therapist' CHECK (role IN ('therapist')),
  token_hash text NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practices_owner_therapist_id
ON public.practices(owner_therapist_id);

CREATE INDEX IF NOT EXISTS idx_practice_members_practice_id
ON public.practice_members(practice_id);

CREATE INDEX IF NOT EXISTS idx_practice_members_therapist_id
ON public.practice_members(therapist_id);

CREATE INDEX IF NOT EXISTS idx_practice_members_active
ON public.practice_members(practice_id, therapist_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_therapist_invites_practice_id
ON public.therapist_invites(practice_id);

CREATE INDEX IF NOT EXISTS idx_therapist_invites_email
ON public.therapist_invites(lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_therapist_invites_token_hash
ON public.therapist_invites(token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_therapist_invites_active_email
ON public.therapist_invites(practice_id, lower(email))
WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_practices_updated_at ON public.practices;
CREATE TRIGGER touch_practices_updated_at
BEFORE UPDATE ON public.practices
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_practice_members_updated_at ON public.practice_members;
CREATE TRIGGER touch_practice_members_updated_at
BEFORE UPDATE ON public.practice_members
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_therapist_invites_updated_at ON public.therapist_invites;
CREATE TRIGGER touch_therapist_invites_updated_at
BEFORE UPDATE ON public.therapist_invites
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_practice_owner(target_practice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_members pm
    WHERE pm.practice_id = target_practice_id
      AND pm.therapist_id = public.current_therapist_id()
      AND pm.role = 'owner'
      AND pm.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_practice_member(target_practice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_members pm
    WHERE pm.practice_id = target_practice_id
      AND pm.therapist_id = public.current_therapist_id()
      AND pm.status = 'active'
  )
$$;

ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice members can read their practice" ON public.practices;
CREATE POLICY "practice members can read their practice"
ON public.practices
FOR SELECT
TO authenticated
USING (public.is_practice_member(id));

DROP POLICY IF EXISTS "practice owners can update practice" ON public.practices;
CREATE POLICY "practice owners can update practice"
ON public.practices
FOR UPDATE
TO authenticated
USING (public.is_practice_owner(id))
WITH CHECK (public.is_practice_owner(id));

DROP POLICY IF EXISTS "practice members can read memberships" ON public.practice_members;
CREATE POLICY "practice members can read memberships"
ON public.practice_members
FOR SELECT
TO authenticated
USING (public.is_practice_member(practice_id));

DROP POLICY IF EXISTS "practice owners can manage memberships" ON public.practice_members;
CREATE POLICY "practice owners can manage memberships"
ON public.practice_members
FOR ALL
TO authenticated
USING (public.is_practice_owner(practice_id))
WITH CHECK (public.is_practice_owner(practice_id));

DROP POLICY IF EXISTS "practice owners can read invites" ON public.therapist_invites;
CREATE POLICY "practice owners can read invites"
ON public.therapist_invites
FOR SELECT
TO authenticated
USING (public.is_practice_owner(practice_id));

DROP POLICY IF EXISTS "practice owners can create invites" ON public.therapist_invites;
CREATE POLICY "practice owners can create invites"
ON public.therapist_invites
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_practice_owner(practice_id)
  AND invited_by_therapist_id = public.current_therapist_id()
);

DROP POLICY IF EXISTS "practice owners can revoke invites" ON public.therapist_invites;
CREATE POLICY "practice owners can revoke invites"
ON public.therapist_invites
FOR UPDATE
TO authenticated
USING (public.is_practice_owner(practice_id))
WITH CHECK (public.is_practice_owner(practice_id));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.therapist_invites TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_therapist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_practice_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_practice_member(uuid) TO authenticated;
