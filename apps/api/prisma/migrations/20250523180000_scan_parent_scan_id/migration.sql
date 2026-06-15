-- AlterTable
ALTER TABLE "Scan" ADD COLUMN "parentScanId" TEXT;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_parentScanId_fkey" FOREIGN KEY ("parentScanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Scan_orgId_parentScanId_idx" ON "Scan"("orgId", "parentScanId");
