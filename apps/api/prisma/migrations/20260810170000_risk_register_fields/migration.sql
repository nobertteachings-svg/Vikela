-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskStatus') THEN
    CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Risk" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Operational',
  "likelihood" INTEGER NOT NULL,
  "impact" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
  "ownerId" TEXT,
  "mitigation" TEXT,
  "nextReviewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- AlterTable (for databases that already had Risk without new columns)
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'Operational';
ALTER TABLE "Risk" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Risk_orgId_idx" ON "Risk"("orgId");
CREATE INDEX IF NOT EXISTS "Risk_ownerId_idx" ON "Risk"("ownerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Risk_orgId_fkey'
  ) THEN
    ALTER TABLE "Risk"
      ADD CONSTRAINT "Risk_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Risk_ownerId_fkey'
  ) THEN
    ALTER TABLE "Risk"
      ADD CONSTRAINT "Risk_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "Member"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
