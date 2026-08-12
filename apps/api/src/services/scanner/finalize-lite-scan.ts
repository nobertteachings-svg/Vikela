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
import { computeScanScoreFromFindings } from "../../lib/scan-score.js";
import { isDemoConnectAllowed } from "../../lib/auth.js";

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

  // Sample gaps only in explicit local demo mode — never invent findings for real customers.
  const useSample =
    isDemoConnectAllowed() && realGapCount < LITE_SCAN_MIN_REAL_FINDINGS;
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

  const openGaps = await prisma.gap.findMany({
    where: { scanId, orgId, status: "OPEN" },
    select: {
      severity: true,
      title: true,
      control: { select: { code: true } },
    },
  });
  const gapCount = openGaps.length;

  const { score, totalChecks, passedChecks } = computeScanScoreFromFindings(
    openGaps.map((g) => ({
      severity: g.severity,
      title: g.title,
      controlCode: g.control?.code,
    })),
    { baselineChecks: 40 }
  );

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "COMPLETED",
      score,
      totalChecks,
      passedChecks,
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
