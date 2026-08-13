import { prisma } from "../../lib/prisma.js";
import { emitScanCompleted } from "../../lib/dispatch-org-webhooks.js";
import { notifyScanEmails } from "../../lib/notify-scan-emails.js";
import { executeCodeScan } from "./execute-code-scan.js";
import { executeCloudScan } from "./execute-cloud-scan.js";
import { executeIdentityScan } from "./execute-identity-scan.js";
import { ingestOrgKnowledge } from "../rag/ingest.js";
import { syncOrgComplianceState } from "../../lib/sync-org-compliance.js";

export interface FullScanResult {
  scanId: string;
  codeScans: number;
  cloudScans: number;
  identityScans: number;
  totalGaps: number;
  score: number;
}

export async function executeFullScan(
  orgId: string,
  existingScanId?: string
): Promise<FullScanResult> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const parentScan = existingScanId
    ? await prisma.scan.update({
        where: { id: existingScanId },
        data: { status: "RUNNING", startedAt: new Date() },
      })
    : await prisma.scan.create({
        data: {
          orgId,
          scanType: "FULL",
          status: "RUNNING",
        },
      });

  let totalGaps = 0;
  let codeScans = 0;
  let cloudScans = 0;
  let identityScans = 0;
  const scores: number[] = [];

  try {
    const repos = await prisma.repository.findMany({
      where: { orgId, isActive: true },
    });
    for (const repo of repos) {
      try {
        const r = await executeCodeScan({ repoId: repo.id, parentScanId: parentScan.id });
        totalGaps += r.gapCount;
        scores.push(r.score);
        codeScans++;
      } catch (e) {
        console.warn(`Full scan code failed for ${repo.id}:`, e);
      }
    }

    const cloudAccounts = await prisma.cloudAccount.findMany({
      where: { orgId, isActive: true },
    });
    for (const ca of cloudAccounts) {
      try {
        const r = await executeCloudScan({ cloudAccountId: ca.id, parentScanId: parentScan.id });
        totalGaps += r.gapCount;
        scores.push(r.score);
        cloudScans++;
      } catch (e) {
        console.warn(`Full scan cloud failed for ${ca.id}:`, e);
      }
    }

    const identityIntegrations = await prisma.integration.findMany({
      where: { orgId, category: "IDENTITY", isActive: true },
    });
    for (const i of identityIntegrations) {
      try {
        const r = await executeIdentityScan({ integrationId: i.id, parentScanId: parentScan.id });
        totalGaps += r.gapCount;
        scores.push(r.score);
        identityScans++;
      } catch (e) {
        console.warn(`Full scan identity failed for ${i.id}:`, e);
      }
    }

    const score =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 100;

    await prisma.scan.update({
      where: { id: parentScan.id },
      data: {
        status: "COMPLETED",
        score,
        totalChecks: codeScans + cloudScans + identityScans,
        passedChecks: Math.max(
          0,
          codeScans + cloudScans + identityScans - Math.min(totalGaps, 20)
        ),
        completedAt: new Date(),
      },
    });

    emitScanCompleted(orgId, {
      id: parentScan.id,
      scanType: parentScan.scanType,
      status: "COMPLETED",
      score,
      gapCount: totalGaps,
      completedAt: new Date(),
    });

    // Parent FULL scan has no gap rows, gap alert emails fire when each sub-scan completes.
    notifyScanEmails(
      orgId,
      {
        scanId: parentScan.id,
        scanType: parentScan.scanType,
        score,
        gapCount: totalGaps,
      },
      { includeGapAlerts: false }
    );

    ingestOrgKnowledge(orgId).catch(() => {});
    await syncOrgComplianceState(orgId);

    return {
      scanId: parentScan.id,
      codeScans,
      cloudScans,
      identityScans,
      totalGaps,
      score,
    };
  } catch (e) {
    await prisma.scan
      .update({
        where: { id: parentScan.id },
        data: { status: "FAILED", completedAt: new Date() },
      })
      .catch(() => {});
    throw e;
  }
}
