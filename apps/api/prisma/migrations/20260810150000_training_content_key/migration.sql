-- AlterTable
ALTER TABLE "TrainingModule" ADD COLUMN IF NOT EXISTS "contentKey" TEXT;

-- CreateIndex (unique per org when contentKey is set; Postgres allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingModule_orgId_contentKey_key" ON "TrainingModule"("orgId", "contentKey");
