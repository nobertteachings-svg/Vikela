-- Production features: Stripe fields, training, questionnaires, embeddings

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS "embedding" JSONB;

CREATE TYPE "TrainingModuleStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'COMPLETE', 'OVERDUE');
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'COMPLETE');
CREATE TYPE "ItemReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'EDIT', 'SKIP');

CREATE TABLE IF NOT EXISTS "TrainingModule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "framework" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "dueAt" TIMESTAMP(3),
    "completed" INTEGER NOT NULL DEFAULT 0,
    "assigned" INTEGER NOT NULL DEFAULT 0,
    "status" "TrainingModuleStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Questionnaire" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireItem" (
    "id" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "suggestedAnswer" TEXT,
    "finalAnswer" TEXT,
    "status" "ItemReviewStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionnaireItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingModule_orgId_idx" ON "TrainingModule"("orgId");
CREATE INDEX IF NOT EXISTS "Questionnaire_orgId_idx" ON "Questionnaire"("orgId");
CREATE INDEX IF NOT EXISTS "QuestionnaireItem_questionnaireId_idx" ON "QuestionnaireItem"("questionnaireId");

ALTER TABLE "TrainingModule" ADD CONSTRAINT "TrainingModule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionnaireItem" ADD CONSTRAINT "QuestionnaireItem_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
