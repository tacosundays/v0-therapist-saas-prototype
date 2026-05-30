-- ============================================================
-- STRIPE BILLING COLUMNS FOR THERAPISTS TABLE
-- ============================================================
-- Run this migration in Supabase SQL Editor to enable billing
-- 
-- This adds all required columns for Stripe subscription management:
-- - stripe_customer_id: Links therapist to Stripe customer
-- - stripe_subscription_id: Active subscription reference
-- - subscription_status: trialing, active, canceled, past_due, inactive
-- - subscription_plan: Product ID (solo, group, enterprise)
-- - subscription_end_date: Current billing period end
-- - trial_end_date: When free trial expires
-- ============================================================

-- Add Stripe billing columns (IF NOT EXISTS for safety)
ALTER TABLE therapists 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS subscription_plan text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz,
ADD COLUMN IF NOT EXISTS trial_end_date timestamptz DEFAULT (now() + interval '14 days');

-- Create index for faster Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_therapists_stripe_customer_id 
ON therapists(stripe_customer_id);

-- Create index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_therapists_subscription_status 
ON therapists(subscription_status);

-- Update existing therapists to have trial_end_date if null
UPDATE therapists 
SET trial_end_date = created_at + interval '14 days'
WHERE trial_end_date IS NULL 
AND created_at IS NOT NULL;

-- Set default subscription_status for existing rows
UPDATE therapists 
SET subscription_status = 'trialing'
WHERE subscription_status IS NULL;

-- ============================================================
-- VERIFICATION QUERY (run after migration to confirm)
-- ============================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'therapists' 
-- AND column_name IN (
--   'stripe_customer_id', 
--   'stripe_subscription_id', 
--   'subscription_status', 
--   'subscription_plan',
--   'subscription_end_date',
--   'trial_end_date'
-- );
-- ============================================================
