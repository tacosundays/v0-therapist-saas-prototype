-- Add Stripe billing columns to therapists table
-- Run this migration in Supabase SQL Editor

ALTER TABLE therapists 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_plan text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz DEFAULT (now() + interval '14 days');

-- Create index for faster lookups by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_therapists_stripe_customer_id 
ON therapists(stripe_customer_id);

-- Add comment for documentation
COMMENT ON COLUMN therapists.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN therapists.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN therapists.subscription_status IS 'trialing, active, canceled, past_due, inactive';
COMMENT ON COLUMN therapists.subscription_plan IS 'Product ID: solo, group, enterprise';
COMMENT ON COLUMN therapists.subscription_end_date IS 'When current subscription period ends';
COMMENT ON COLUMN therapists.trial_end_date IS 'When free trial ends';
