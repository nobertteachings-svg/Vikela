import { prisma } from "../../lib/prisma.js";
import type { ScanFinding } from "@vikela/shared";
import { redactCodeSnippet } from "../../lib/redact-secrets.js";
import { emitGapCreated } from "../../lib/dispatch-org-webhooks.js";
import { syncOrgComplianceState } from "../../lib/sync-org-compliance.js";

export async function persistGaps(params: {
  orgId: string;
  scanId: string;
  repoId: string | null;
  cloudAccountId: string | null;
  findings: ScanFinding[];
  replaceExisting?: boolean;
  isSample?: boolean;
}): Promise<number> {
  const { orgId, scanId, repoId, cloudAccountId, findings, replaceExisting, isSample } = params;

  if (replaceExisting) {
    await prisma.gap.deleteMany({
      where: { scanId, status: "OPEN" },
    });
  }

  const codes = findings.map((f) => f.controlCode).filter(Boolean) as string[];
  const controls = await prisma.control.findMany({
    where: { code: { in: codes } },
  });
  const controlMap = new Map(controls.map((c) => [c.code, c.id]));

  for (const f of findings) {
    const gap = await prisma.gap.create({
      data: {
        orgId,
        scanId,
        repoId,
        cloudAccountId,
        controlId: f.controlCode ? controlMap.get(f.controlCode) : undefined,
        title: f.title,
        description: f.description,
        severity: f.severity,
        status: "OPEN",
        source: f.source,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        codeSnippet: redactCodeSnippet(f.codeSnippet),
        cloudProvider: f.cloudProvider,
        resourceType: f.resourceType,
        resourceId: f.resourceId,
        region: f.region,
        remediation: f.remediation,
        isSample: isSample ?? false,
      },
    });
    if (!gap.isSample) {
      emitGapCreated(orgId, {
        id: gap.id,
        scanId: gap.scanId,
        title: gap.title,
        severity: gap.severity,
        source: gap.source,
        controlCode: f.controlCode ?? null,
        isSample: gap.isSample,
      });
    }
  }

  await syncOrgComplianceState(orgId);

  return findings.length;
}
