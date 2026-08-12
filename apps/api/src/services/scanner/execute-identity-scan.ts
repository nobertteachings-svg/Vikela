import { prisma } from "../../lib/prisma.js";
import { emitScanCompleted } from "../../lib/dispatch-org-webhooks.js";
import { notifyScanEmails } from "../../lib/notify-scan-emails.js";
import { runIdentityScan } from "./identity-runner.js";
import { enrichFindingsWithRemediation } from "./enrich-findings.js";
import { persistGaps } from "./persist-gaps.js";
import {
  filterFindingsForScope,
  getOrgFrameworkScanScope,
} from "./framework-scope.js";
import { computeScanScoreFromFindings } from "../../lib/scan-score.js";

export interface IdentityScanOptions {
  integrationId: string;
  replaceExistingGaps?: boolean;
  parentScanId?: string;
}

export async function executeIdentityScan(options: IdentityScanOptions) {
  const integration = await prisma.integration.findUnique({
    where: { id: options.integrationId },
    include: { org: true },
  });

  if (!integration) throw new Error("Integration not found");
  if (integration.category !== "IDENTITY") {
    throw new Error("Integration is not an identity provider");
  }

  const scan = await prisma.scan.create({
    data: {
      orgId: integration.orgId,
      integrationId: integration.id,
      parentScanId: options.parentScanId,
      scanType: "IDENTITY",
      status: "RUNNING",
    },
  });

  let findings = await runIdentityScan(
    integration.provider,
    integration.accessToken,
    (integration.metadata as Record<string, unknown>) ?? null
  );

  findings = await enrichFindingsWithRemediation(findings, integration.org.name);

  const scope = await getOrgFrameworkScanScope(integration.orgId);
  findings = filterFindingsForScope(findings, scope);

  const gapCount = await persistGaps({
    orgId: integration.orgId,
    scanId: scan.id,
    repoId: null,
    cloudAccountId: null,
    findings,
    replaceExisting: options.replaceExistingGaps,
  });

  const { score, totalChecks, passedChecks } = computeScanScoreFromFindings(findings, {
    baselineChecks: 12,
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

  emitScanCompleted(integration.orgId, {
    id: scan.id,
    scanType: scan.scanType,
    status: "COMPLETED",
    score,
    gapCount,
    completedAt: new Date(),
  });

  notifyScanEmails(integration.orgId, {
    scanId: scan.id,
    scanType: scan.scanType,
    score,
    gapCount,
  });

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncedAt: new Date() },
  });

  return { scanId: scan.id, gapCount, score, findings };
}
