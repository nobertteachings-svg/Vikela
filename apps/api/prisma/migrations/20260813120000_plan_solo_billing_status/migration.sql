-- Add Solo plan + billing status fields for Stripe-driven entitlements.

-- Plan enum: SOLO
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'SOLO';

-- BillingStatus enum
DO $$ BEGIN
  CREATE TYPE "BillingStatus" AS ENUM ('FREE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'COMPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PlanSource enum
DO $$ BEGIN
  CREATE TYPE "PlanSource" AS ENUM ('STRIPE', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "billingStatus" "BillingStatus" NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "planSource" "PlanSource" NOT NULL DEFAULT 'STRIPE',
  ADD COLUMN IF NOT EXISTS "billingInterval" TEXT,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

-- Backfill billingStatus from existing plan / subscription
UPDATE "Organization"
SET "billingStatus" = CASE
  WHEN "stripeSubscriptionId" IS NOT NULL THEN 'ACTIVE'::"BillingStatus"
  WHEN "plan" = 'FREE' THEN 'FREE'::"BillingStatus"
  ELSE 'COMPED'::"BillingStatus"
END
WHERE "billingStatus" = 'FREE' AND ("plan" <> 'FREE' OR "stripeSubscriptionId" IS NOT NULL);

-- Manual enterprise comps
UPDATE "Organization"
SET "planSource" = 'MANUAL'
WHERE "plan" = 'ENTERPRISE' AND "stripeSubscriptionId" IS NULL;
