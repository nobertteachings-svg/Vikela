import { prisma } from "../../lib/prisma.js";
import { optionalDateFilter } from "../../lib/audit-date-range.js";

export async function getEvidenceCoverage(
  orgId: string,
  options?: { from?: string; to?: string }
) {
  const collectedAt = optionalDateFilter(options?.from, options?.to);
  const evidenceWhere = collectedAt ? { collectedAt } : undefined;

  const orgControls = await prisma.orgControl.findMany({
    where: { orgId },
    include: {
      control: { select: { code: true, title: true, category: true } },
      ...(evidenceWhere
        ? {
            _count: { select: { evidence: { where: evidenceWhere } } },
            evidence: {
              where: evidenceWhere,
              take: 1,
              select: { id: true, title: true, type: true, collectedAt: true },
            },
          }
        : {
            evidence: {
              select: { id: true, title: true, type: true, collectedAt: true },
            },
          }),
    },
    orderBy: { control: { code: "asc" } },
  });

  const rows = orgControls.map((oc) => {
    const evidenceCount = evidenceWhere
      ? (oc as typeof oc & { _count: { evidence: number } })._count.evidence
      : oc.evidence.length;
    const hasEvidence = evidenceCount > 0;

    return {
      orgControlId: oc.id,
      controlCode: oc.control.code,
      controlTitle: oc.control.title,
      category: oc.control.category,
      controlStatus: oc.status,
      evidenceCount,
      hasEvidence,
      evidence: oc.evidence.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        collectedAt: e.collectedAt.toISOString(),
      })),
    };
  });

  const withEvidence = rows.filter((r) => r.hasEvidence).length;
  const total = rows.length;

  return {
    totalControls: total,
    controlsWithEvidence: withEvidence,
    coveragePercent: total > 0 ? Math.round((withEvidence / total) * 100) : 0,
    controls: rows,
  };
}
