import type { ScanFinding } from "@vikela/shared";
import { prisma } from "../../lib/prisma.js";
import {
  resolveLiteScanFallbackReason,
  trackLiteScanCompleted,
} from "../../lib/product-events.js";
import { emitScanCompleted } from "../../lib/dispatch-org-webhooks.js";
import { notifyScanEmails } from "../../lib/notify-scan-emails.js";
import type { RepoStack } from "./detect-repo-stack.js";
import { persistGaps } from "./persist-gaps.js";
import { getSampleFindings, LITE_SCAN_MIN_REAL_FINDINGS } from "./sample-gaps.js";

export async function finalizeLiteScan(params: {
  scanId: string;
  orgId: string;
  repoId: string;
  repoStack: RepoStack;
  realGapCount: number;
  realFindings: ScanFinding[];
  listFailed?: boolean;
  filesListed?: number;
  noRepo?: boolean;
  provider?: import("../../lib/product-events.js").LiteScanGitProvider;
}): Promise<{
  source: "repo" | "sample" | "mixed";
  findingCount: number;
  score: number;
  fallbackReason: ReturnType<typeof resolveLiteScanFallbackReason>;
}> {
  const {
    scanId,
    orgId,
    repoId,
    repoStack,
    realGapCount,
    listFailed = false,
    filesListed = 0,
    noRepo = false,
    provider,
  } = params;

  const fallbackReason = resolveLiteScanFallbackReason({
    realGapCount,
    listFailed,
    minRealFindings: LITE_SCAN_MIN_REAL_FINDINGS,
    noRepo,
  });

  const useSample = realGapCount < LITE_SCAN_MIN_REAL_FINDINGS;
  let source: "repo" | "sample" | "mixed" = "repo";

  if (useSample) {
    const needed = Math.max(5 - realGapCount, LITE_SCAN_MIN_REAL_FINDINGS);
    const samples = getSampleFindings(repoStack, needed);

    if (realGapCount === 0) {
      source = "sample";
      await prisma.gap.deleteMany({ where: { scanId, orgId } });
      await persistGaps({
        orgId,
        scanId,
        repoId,
        cloudAccountId: null,
        findings: samples,
        isSample: true,
      });
    } else {
      source = "mixed";
      await persistGaps({
        orgId,
        scanId,
        repoId,
        cloudAccountId: null,
        findings: samples.slice(0, needed),
        isSample: true,
      });
    }
  }

  const gapCount = await prisma.gap.count({
    where: { scanId, orgId, status: "OPEN" },
  });

  const totalChecks = 40;
  const score = Math.max(
    0,
    Math.min(100, Math.round(((totalChecks - gapCount) / totalChecks) * 100))
  );

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "COMPLETED",
      score,
      totalChecks,
      passedChecks: totalChecks - gapCount,
      completedAt: new Date(),
      isLiteScan: true,
    },
  });

  emitScanCompleted(orgId, {
    id: scanId,
    scanType: "CODE",
    status: "COMPLETED",
    score,
    gapCount,
    isLiteScan: true,
    completedAt: new Date(),
  });

  notifyScanEmails(orgId, {
    scanId,
    scanType: "CODE",
    score,
    gapCount,
    isLiteScan: true,
  });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });

  trackLiteScanCompleted({
    orgId,
    orgSlug: org?.slug ?? orgId,
    source,
    repoId: repoId || undefined,
    findingCount: gapCount,
    scanId,
    repoStack,
    listFailed,
    filesListed,
    fallbackReason,
    provider,
  });

  return { source, findingCount: gapCount, score, fallbackReason };
}
