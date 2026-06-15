import type { OrgFramework } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function enrollOrgInFramework(
  orgId: string,
  frameworkId: string,
  opts?: { controlLimit?: number }
): Promise<{ orgFramework: OrgFramework; controlsCreated: number }> {
  const orgFramework = await prisma.orgFramework.upsert({
    where: { orgId_frameworkId: { orgId, frameworkId } },
    create: {
      orgId,
      frameworkId,
      status: "IN_PROGRESS",
      score: 0,
    },
    update: {},
  });

  const existing = await prisma.orgControl.findMany({
    where: {
      orgId,
      control: { frameworks: { some: { frameworkId } } },
    },
    select: { controlId: true },
  });
  const existingIds = new Set(existing.map((c) => c.controlId));

  const links = await prisma.controlFramework.findMany({
    where: { frameworkId },
    orderBy: { control: { code: "asc" } },
    ...(opts?.controlLimit ? { take: opts.controlLimit } : {}),
  });

  const toCreate = links.filter((l) => !existingIds.has(l.controlId));

  if (toCreate.length > 0) {
    await prisma.orgControl.createMany({
      data: toCreate.map((l) => ({
        orgId,
        controlId: l.controlId,
        status: "NOT_STARTED" as const,
      })),
      skipDuplicates: true,
    });
  }

  return { orgFramework, controlsCreated: toCreate.length };
}

export async function unenrollOrgFromFramework(
  orgId: string,
  frameworkId: string
): Promise<{
  removed: boolean;
  controlsRemoved: number;
  controlsRetained: number;
}> {
  const orgFramework = await prisma.orgFramework.findUnique({
    where: { orgId_frameworkId: { orgId, frameworkId } },
  });
  if (!orgFramework) {
    return { removed: false, controlsRemoved: 0, controlsRetained: 0 };
  }

  const otherEnrolled = await prisma.orgFramework.findMany({
    where: { orgId, frameworkId: { not: frameworkId } },
    select: { frameworkId: true },
  });
  const otherFrameworkIds = otherEnrolled.map((f) => f.frameworkId);

  const frameworkControlIds = (
    await prisma.controlFramework.findMany({
      where: { frameworkId },
      select: { controlId: true },
    })
  ).map((c) => c.controlId);

  if (frameworkControlIds.length === 0) {
    await prisma.orgFramework.delete({
      where: { orgId_frameworkId: { orgId, frameworkId } },
    });
    return { removed: true, controlsRemoved: 0, controlsRetained: 0 };
  }

  const orgControls = await prisma.orgControl.findMany({
    where: { orgId, controlId: { in: frameworkControlIds } },
    include: {
      _count: { select: { evidence: true } },
      control: {
        include: {
          frameworks: {
            where: { frameworkId: { in: otherFrameworkIds } },
            select: { frameworkId: true },
          },
        },
      },
    },
  });

  const toDelete: string[] = [];
  let controlsRetained = 0;

  for (const oc of orgControls) {
    const sharedWithOtherEnrolled = oc.control.frameworks.length > 0;
    const hasEvidence = oc._count.evidence > 0;
    if (sharedWithOtherEnrolled || hasEvidence) {
      controlsRetained += 1;
    } else {
      toDelete.push(oc.id);
    }
  }

  await prisma.$transaction([
    ...(toDelete.length > 0
      ? [prisma.orgControl.deleteMany({ where: { id: { in: toDelete } } })]
      : []),
    prisma.orgFramework.delete({
      where: { orgId_frameworkId: { orgId, frameworkId } },
    }),
  ]);

  return {
    removed: true,
    controlsRemoved: toDelete.length,
    controlsRetained,
  };
}
