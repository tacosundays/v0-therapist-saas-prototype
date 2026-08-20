-- Organization-owned billing and entitlements. Therapist billing columns remain
-- temporarily for webhook rollback compatibility and can be removed later.

ALTER TABLE public.organizations
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN stripe_customer_id text,
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN current_period_end timestamptz,
  ADD COLUMN trial_ends_at timestamptz;

CREATE UNIQUE INDEX organizations_stripe_customer_id_unique
ON public.organizations(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX organizations_stripe_subscription_id_unique
ON public.organizations(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

UPDATE public.organizations o
SET
  subscription_status = COALESCE(NULLIF(t.subscription_status, ''), 'inactive'),
  subscription_plan = COALESCE(NULLIF(t.plan, ''), NULLIF(t.subscription_plan, ''), o.plan, 'free'),
  plan = COALESCE(NULLIF(t.plan, ''), NULLIF(t.subscription_plan, ''), o.plan, 'free'),
  stripe_customer_id = t.stripe_customer_id,
  stripe_subscription_id = t.stripe_subscription_id,
  current_period_end = COALESCE(t.current_period_end, t.subscription_end_date),
  trial_ends_at = COALESCE(t.trial_ends_at, t.trial_end_date)
FROM public.therapists t
WHERE t.id = o.billing_owner_therapist_id;

CREATE OR REPLACE FUNCTION public.is_current_organization_billing_admin(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = target_organization_id
      AND om.therapist_id = public.current_therapist_id()
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
  )
$$;

REVOKE ALL ON FUNCTION public.is_current_organization_billing_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_organization_billing_admin(uuid) TO authenticated;

CREATE POLICY "organization billing admins can update billing settings"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_current_organization_billing_admin(id))
WITH CHECK (public.is_current_organization_billing_admin(id));
