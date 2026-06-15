import { prisma } from "./prisma.js";
import { buildControlIdsWithGaps } from "./control-gap-inheritance.js";

export async function hasOrgCompletedScan(orgId: string): Promise<boolean> {
  const count = await prisma.scan.count({
    where: { orgId, status: "COMPLETED" },
  });
  return count > 0;
}

/** Gap-free controls / total controls in framework, rounded. */
export function scoreFromGapCounts(totalControls: number, controlsWithOpenGaps: number): number {
  if (totalControls === 0) return 0;
  const gapFree = Math.max(0, totalControls - controlsWithOpenGaps);
  return Math.round((100 * gapFree) / totalControls);
}

export function deriveControlStatus(openGapCount: number, hasScan: boolean): "NOT_STARTED" | "IMPLEMENTED" | "NEEDS_REVIEW" {
  if (!hasScan) return "NOT_STARTED";
  if (openGapCount > 0) return "NEEDS_REVIEW";
  return "IMPLEMENTED";
}

/**
 * Org-wide controls met: gap-free org controls / total org controls.
 * Returns 0 implemented until the org has at least one completed scan.
 */
export async function computeControlsMet(orgId: string): Promise<{
  controlsTotal: number;
  controlsImplemented: number;
}> {
  const controlsTotal = await prisma.orgControl.count({ where: { orgId } });
  if (controlsTotal === 0) {
    return { controlsTotal: 0, controlsImplemented: 0 };
  }

  const hasScan = await hasOrgCompletedScan(orgId);
  if (!hasScan) {
    return { controlsTotal, controlsImplemented: 0 };
  }

  const orgControls = await prisma.orgControl.findMany({
    where: { orgId },
    select: { controlId: true },
  });
  const controlIds = orgControls.map((oc) => oc.controlId);
  const controlIdsWithGaps = await buildControlIdsWithGaps(orgId, controlIds);
  const controlsImplemented = controlIds.filter((id) => !controlIdsWithGaps.has(id)).length;

  return { controlsTotal, controlsImplemented };
}

/** Controls met scoped to a single enrolled framework. */
export async function computeControlsMetForFramework(
  orgId: string,
  frameworkId: string
): Promise<{ controlsTotal: number; controlsImplemented: number }> {
  const controlIds = (
    await prisma.controlFramework.findMany({
      where: { frameworkId },
      select: { controlId: true },
    })
  ).map((l) => l.controlId);

  if (controlIds.length === 0) {
    return { controlsTotal: 0, controlsImplemented: 0 };
  }

  const controlsTotal = await prisma.orgControl.count({
    where: { orgId, controlId: { in: controlIds } },
  });

  if (controlsTotal === 0) {
    return { controlsTotal: 0, controlsImplemented: 0 };
  }

  const hasScan = await hasOrgCompletedScan(orgId);
  if (!hasScan) {
    return { controlsTotal, controlsImplemented: 0 };
  }

  const enrolledControlIds = (
    await prisma.orgControl.findMany({
      where: { orgId, controlId: { in: controlIds } },
      select: { controlId: true },
    })
  ).map((oc) => oc.controlId);

  const controlIdsWithGaps = await buildControlIdsWithGaps(orgId, enrolledControlIds);
  const controlsImplemented = enrolledControlIds.filter((id) => !controlIdsWithGaps.has(id)).length;

  return { controlsTotal, controlsImplemented };
}

/**
 * Live framework readiness: % of framework controls with zero OPEN gaps.
 * Returns 0 for all frameworks until the org has at least one completed scan.
 */
export async function computeFrameworkScoresForOrg(
  orgId: string,
  frameworkIds?: string[]
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  if (frameworkIds) {
    for (const id of frameworkIds) scores.set(id, 0);
  }

  const hasScan = await hasOrgCompletedScan(orgId);
  if (!hasScan) return scores;

  const controlLinks = await prisma.controlFramework.findMany({
    where: frameworkIds?.length ? { frameworkId: { in: frameworkIds } } : {},
    select: { frameworkId: true, controlId: true },
  });

  const controlsByFramework = new Map<string, string[]>();
  for (const link of controlLinks) {
    const list = controlsByFramework.get(link.frameworkId) ?? [];
    list.push(link.controlId);
    controlsByFramework.set(link.frameworkId, list);
  }

  const allControlIds = [...new Set(controlLinks.map((l) => l.controlId))];
  const controlIdsWithGaps = await buildControlIdsWithGaps(orgId, allControlIds);

  for (const [frameworkId, controlIds] of controlsByFramework) {
    const total = controlIds.length;
    const withGaps = controlIds.filter((id) => controlIdsWithGaps.has(id)).length;
    scores.set(frameworkId, scoreFromGapCounts(total, withGaps));
  }

  return scores;
}

export async function computeFrameworkScore(orgId: string, frameworkId: string): Promise<number> {
  const scores = await computeFrameworkScoresForOrg(orgId, [frameworkId]);
  return scores.get(frameworkId) ?? 0;
}
