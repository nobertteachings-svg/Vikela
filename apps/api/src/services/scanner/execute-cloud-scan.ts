import { prisma } from "../../lib/prisma.js";
import { emitScanCompleted } from "../../lib/dispatch-org-webhooks.js";
import { notifyScanEmails } from "../../lib/notify-scan-emails.js";
import { runCloudScan } from "./cloud-runner.js";
import { enrichFindingsWithRemediation } from "./enrich-findings.js";
import { persistGaps } from "./persist-gaps.js";
import {
  filterFindingsForScope,
  getOrgFrameworkScanScope,
} from "./framework-scope.js";
import { computeScanScoreFromFindings } from "../../lib/scan-score.js";

export interface CloudScanOptions {
  cloudAccountId: string;
  replaceExistingGaps?: boolean;
  parentScanId?: string;
}

export async function executeCloudScan(options: CloudScanOptions) {
  const account = await prisma.cloudAccount.findUnique({
    where: { id: options.cloudAccountId },
    include: { integration: true, org: true },
  });

  if (!account) throw new Error("Cloud account not found");

  const metadata = (account.integration.metadata as Record<string, unknown>) ?? {};

  const scan = await prisma.scan.create({
    data: {
      orgId: account.orgId,
      integrationId: account.integrationId,
      cloudAccountId: account.id,
      parentScanId: options.parentScanId,
      scanType: "CLOUD",
      status: "RUNNING",
    },
  });

  let findings = await runCloudScan(
    account.provider,
    account.integration.accessToken,
    metadata
  );

  findings = await enrichFindingsWithRemediation(findings, account.org.name);

  const scope = await getOrgFrameworkScanScope(account.orgId);
  findings = filterFindingsForScope(findings, scope);

  const gapCount = await persistGaps({
    orgId: account.orgId,
    scanId: scan.id,
    repoId: null,
    cloudAccountId: account.id,
    findings,
    replaceExisting: options.replaceExistingGaps,
  });

  const { score, totalChecks, passedChecks } = computeScanScoreFromFindings(findings, {
    baselineChecks: 25,
  });

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      status: "COMPLETED",
      score,
      totalChecks,
      passedChecks,
      completedAt: new Date(),
    },
  });

  emitScanCompleted(account.orgId, {
    id: scan.id,
    scanType: scan.scanType,
    status: "COMPLETED",
    score,
    gapCount,
    completedAt: new Date(),
  });

  notifyScanEmails(account.orgId, {
    scanId: scan.id,
    scanType: scan.scanType,
    score,
    gapCount,
  });

  await prisma.cloudAccount.update({
    where: { id: account.id },
    data: { lastScannedAt: new Date() },
  });

  await prisma.integration.update({
    where: { id: account.integrationId },
    data: { lastSyncedAt: new Date() },
  });

  return { scanId: scan.id, gapCount, score, findings };
}
