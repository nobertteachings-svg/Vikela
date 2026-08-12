-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Questionnaire_vendorId_idx" ON "Questionnaire"("vendorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vendor_orgId_idx" ON "Vendor"("orgId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Questionnaire_vendorId_fkey'
  ) THEN
    ALTER TABLE "Questionnaire"
      ADD CONSTRAINT "Questionnaire_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
