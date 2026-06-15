-- Production readiness: settings, training progress, API keys, webhooks, audit log, vendor detail fields

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "settings" JSONB;

ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "owner" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "dataAccess" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "contractRenewal" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "score" INTEGER;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "questionnaireStatus" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "documents" JSONB;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "subprocessors" JSONB;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "dataProcessing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "soc2Certified" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "TrainingProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'OVERDUE');

CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "TrainingProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrgWebhook" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgWebhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingAssignment_memberId_moduleId_key" ON "TrainingAssignment"("memberId", "moduleId");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_orgId_idx" ON "TrainingAssignment"("orgId");
CREATE INDEX IF NOT EXISTS "ApiKey_orgId_idx" ON "ApiKey"("orgId");
CREATE INDEX IF NOT EXISTS "OrgWebhook_orgId_idx" ON "OrgWebhook"("orgId");
CREATE INDEX IF NOT EXISTS "AuditEvent_orgId_createdAt_idx" ON "AuditEvent"("orgId", "createdAt");

ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgWebhook" ADD CONSTRAINT "OrgWebhook_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
