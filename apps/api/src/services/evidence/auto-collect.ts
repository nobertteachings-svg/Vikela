import { prisma } from "../../lib/prisma.js";
import type { EvidenceSource, EvidenceType } from "@prisma/client";

/** Create audit-ready evidence records from open gaps (auto-collected metadata). */
export async function collectEvidenceFromGaps(orgId: string): Promise<{
  created: number;
  skipped: number;
  openGaps: number;
}> {
  const gaps = await prisma.gap.findMany({
    where: { orgId, status: "OPEN", isSample: false },
    include: { control: true },
  });

  let created = 0;
  let skipped = 0;

  for (const gap of gaps.slice(0, 20)) {
    if (!gap.controlId) continue;

    const orgControl = await prisma.orgControl.findUnique({
      where: { orgId_controlId: { orgId, controlId: gap.controlId } },
    });
    if (!orgControl) continue;

    const title = `Scan finding: ${gap.title}`;
    const existing = await prisma.evidence.findFirst({
      where: { orgId, controlId: orgControl.id, title },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const source = gapSourceToEvidenceSource(gap.source);
    const type: EvidenceType =
      gap.filePath ? "SCREENSHOT" : gap.cloudProvider ? "LOG" : "CONFIG";

    await prisma.evidence.create({
      data: {
        orgId,
        controlId: orgControl.id,
        title,
        description: `${gap.description}\n\nRemediation: ${gap.remediation}`,
        type,
        source,
        isAutoCollected: true,
      },
    });
    created++;
  }

  return { created, skipped, openGaps: gaps.length };
}

function gapSourceToEvidenceSource(source: string): EvidenceSource {
  const map: Record<string, EvidenceSource> = {
    CODE: "AUTO_GITHUB",
    IAM: "AUTO_AWS",
    LOGGING: "AUTO_AWS",
    ENCRYPTION: "AUTO_AWS",
    MONITORING: "AUTO_AWS",
    NETWORK: "AUTO_AWS",
  };
  return map[source] ?? "MANUAL";
}
