-- Track evidence file size for plan storage meters.
ALTER TABLE "Evidence" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER;
