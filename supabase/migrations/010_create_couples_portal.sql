-- ============================================================
-- COUPLES PORTAL V1
-- ============================================================

CREATE TABLE IF NOT EXISTS public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  partner_1_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  partner_2_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship_name text NOT NULL,
  relationship_status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT couples_distinct_partners_check CHECK (partner_1_client_id <> partner_2_client_id)
);

CREATE INDEX IF NOT EXISTS idx_couples_therapist
ON public.couples(therapist_id);

CREATE INDEX IF NOT EXISTS idx_couples_partner_1
ON public.couples(partner_1_client_id);

CREATE INDEX IF NOT EXISTS idx_couples_partner_2
ON public.couples(partner_2_client_id);

CREATE TABLE IF NOT EXISTS public.couple_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  check_in_week date NOT NULL,
  relationship_satisfaction integer NOT NULL CHECK (relationship_satisfaction BETWEEN 1 AND 10),
  trust integer NOT NULL CHECK (trust BETWEEN 1 AND 10),
  communication integer NOT NULL CHECK (communication BETWEEN 1 AND 10),
  intimacy integer NOT NULL CHECK (intimacy BETWEEN 1 AND 10),
  conflict_level integer NOT NULL CHECK (conflict_level BETWEEN 1 AND 10),
  reflection text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (couple_id, client_id, check_in_week)
);

CREATE INDEX IF NOT EXISTS idx_couple_check_ins_couple_week
ON public.couple_check_ins(couple_id, check_in_week DESC);

CREATE INDEX IF NOT EXISTS idx_couple_check_ins_client
ON public.couple_check_ins(client_id);

CREATE TABLE IF NOT EXISTS public.couple_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_notes_couple
ON public.couple_notes(couple_id, created_at DESC);

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_couple
ON public.assignments(couple_id);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_notes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_couples_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_couple_check_ins_updated_at
ON public.couple_check_ins;

CREATE TRIGGER set_couple_check_ins_updated_at
BEFORE UPDATE ON public.couple_check_ins
FOR EACH ROW
EXECUTE FUNCTION public.set_couples_updated_at();

DROP TRIGGER IF EXISTS set_couple_notes_updated_at
ON public.couple_notes;

CREATE TRIGGER set_couple_notes_updated_at
BEFORE UPDATE ON public.couple_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_couples_updated_at();

DROP POLICY IF EXISTS "Therapists can manage own couples" ON public.couples;
DROP POLICY IF EXISTS "Clients can view their couples" ON public.couples;
DROP POLICY IF EXISTS "Therapists can view couple check ins" ON public.couple_check_ins;
DROP POLICY IF EXISTS "Clients can manage own couple check ins" ON public.couple_check_ins;
DROP POLICY IF EXISTS "Therapists can manage couple notes" ON public.couple_notes;

CREATE POLICY "Therapists can manage own couples"
ON public.couples
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    WHERE t.id = couples.therapist_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.clients p1 ON p1.id = couples.partner_1_client_id AND p1.therapist_id = t.id
    JOIN public.clients p2 ON p2.id = couples.partner_2_client_id AND p2.therapist_id = t.id
    WHERE t.id = couples.therapist_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Clients can view their couples"
ON public.couples
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.user_id = auth.uid()
      AND c.id IN (couples.partner_1_client_id, couples.partner_2_client_id)
  )
);

CREATE POLICY "Therapists can view couple check ins"
ON public.couple_check_ins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    WHERE t.id = couple_check_ins.therapist_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);

CREATE POLICY "Clients can manage own couple check ins"
ON public.couple_check_ins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.couples cp ON cp.id = couple_check_ins.couple_id
    WHERE c.user_id = auth.uid()
      AND c.id = couple_check_ins.client_id
      AND c.id IN (cp.partner_1_client_id, cp.partner_2_client_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.couples cp ON cp.id = couple_check_ins.couple_id
    WHERE c.user_id = auth.uid()
      AND c.id = couple_check_ins.client_id
      AND c.id IN (cp.partner_1_client_id, cp.partner_2_client_id)
      AND cp.therapist_id = couple_check_ins.therapist_id
  )
);

CREATE POLICY "Therapists can manage couple notes"
ON public.couple_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    WHERE t.id = couple_notes.therapist_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.therapists t
    JOIN public.couples cp ON cp.id = couple_notes.couple_id AND cp.therapist_id = t.id
    WHERE t.id = couple_notes.therapist_id
      AND lower(t.email) = lower((auth.jwt() ->> 'email'))
  )
);
