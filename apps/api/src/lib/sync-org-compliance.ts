import { prisma } from "./prisma.js";
import {
  computeFrameworkScoresForOrg,
  deriveControlStatus,
  hasOrgCompletedScan,
} from "./framework-score.js";
import { buildControlIdsWithGaps } from "./control-gap-inheritance.js";

/** Recompute and persist OrgFramework scores and OrgControl statuses after scans. */
export async function syncOrgComplianceState(orgId: string): Promise<void> {
  const hasScan = await hasOrgCompletedScan(orgId);
  if (!hasScan) return;

  const enrolled = await prisma.orgFramework.findMany({
    where: { orgId },
    select: { id: true, frameworkId: true, status: true },
  });

  if (enrolled.length === 0) return;

  const frameworkIds = enrolled.map((e) => e.frameworkId);
  const scores = await computeFrameworkScoresForOrg(orgId, frameworkIds);

  await Promise.all(
    enrolled.map((row) => {
      const score = scores.get(row.frameworkId) ?? 0;
      const status =
        score >= 90
          ? "READY"
          : score > 0 || row.status === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : row.status;
      return prisma.orgFramework.update({
        where: { id: row.id },
        data: { score, status },
      });
    })
  );

  const orgControls = await prisma.orgControl.findMany({
    where: { orgId },
    select: { id: true, controlId: true },
  });

  if (orgControls.length === 0) return;

  const controlIds = orgControls.map((oc) => oc.controlId);
  const controlIdsWithGaps = await buildControlIdsWithGaps(orgId, controlIds);

  await Promise.all(
    orgControls.map((oc) => {
      const hasGap = controlIdsWithGaps.has(oc.controlId);
      const status = deriveControlStatus(hasGap ? 1 : 0, true);
      return prisma.orgControl.update({
        where: { id: oc.id },
        data: { status },
      });
    })
  );
}
