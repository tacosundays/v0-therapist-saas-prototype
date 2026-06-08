-- ============================================================
-- CLIENT INVITATION FIELDS
-- ============================================================

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS invite_token_hash text,
ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_therapist_email_unique
ON public.clients(therapist_id, lower(email))
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_invite_token_hash
ON public.clients(invite_token_hash)
WHERE invite_token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.verify_client_invite(
  client_email text,
  token_hash text
)
RETURNS TABLE (
  id uuid,
  therapist_id uuid,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.therapist_id, c.full_name, c.email
  FROM public.clients c
  WHERE lower(c.email) = lower(client_email)
    AND c.invite_token_hash = token_hash
    AND c.user_id IS NULL
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.verify_client_invite(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_client_invite(text, text) TO authenticated;
