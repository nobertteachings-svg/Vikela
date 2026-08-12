import type { TrainingModuleStatus, TrainingProgressStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/** Pure helper: should this incomplete assignment be OVERDUE given module due date? */
export function computeAssignmentStatus(params: {
  current: TrainingProgressStatus;
  dueAt: Date | null | undefined;
  now?: Date;
}): TrainingProgressStatus {
  if (params.current === "COMPLETE") return "COMPLETE";
  const now = params.now ?? new Date();
  if (params.dueAt && params.dueAt < now) return "OVERDUE";
  if (params.current === "OVERDUE") return "NOT_STARTED";
  return params.current;
}

export function computeModuleStatus(params: {
  assigned: number;
  completed: number;
  overdueCount: number;
  dueAt: Date | null | undefined;
  now?: Date;
}): TrainingModuleStatus {
  const now = params.now ?? new Date();
  if (params.assigned > 0 && params.completed === params.assigned) return "COMPLETE";
  if (params.overdueCount > 0) return "OVERDUE";
  if (params.dueAt && params.dueAt < now && params.completed < params.assigned) {
    return "AT_RISK";
  }
  return "ON_TRACK";
}

/** Flip incomplete past-due assignments to OVERDUE (and clear stale OVERDUE). */
export async function refreshOverdueAssignments(orgId: string): Promise<number> {
  const now = new Date();
  const assignments = await prisma.trainingAssignment.findMany({
    where: { orgId, status: { not: "COMPLETE" } },
    include: { module: { select: { dueAt: true } } },
  });

  let updated = 0;
  for (const row of assignments) {
    const next = computeAssignmentStatus({
      current: row.status,
      dueAt: row.module.dueAt,
      now,
    });
    if (next !== row.status) {
      await prisma.trainingAssignment.update({
        where: { id: row.id },
        data: { status: next },
      });
      updated += 1;
    }
  }

  if (updated > 0) {
    const moduleIds = [...new Set(assignments.map((a) => a.moduleId))];
    await Promise.all(moduleIds.map((id) => syncTrainingModuleStats(orgId, id)));
  }

  return updated;
}

/** Recompute denormalized completion counters on a training module. */
export async function syncTrainingModuleStats(orgId: string, moduleId: string) {
  const [assignments, mod] = await Promise.all([
    prisma.trainingAssignment.findMany({ where: { orgId, moduleId } }),
    prisma.trainingModule.findUnique({ where: { id: moduleId } }),
  ]);
  if (!mod) return;

  const assigned = assignments.length;
  const completed = assignments.filter((a) => a.status === "COMPLETE").length;
  const overdueCount = assignments.filter((a) => a.status === "OVERDUE").length;

  const status = computeModuleStatus({
    assigned,
    completed,
    overdueCount,
    dueAt: mod.dueAt,
  });

  await prisma.trainingModule.update({
    where: { id: moduleId },
    data: { assigned, completed, status },
  });
}

export async function assignModuleToMembers(
  orgId: string,
  moduleId: string,
  memberIds: string[]
) {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length === 0) {
    await syncTrainingModuleStats(orgId, moduleId);
    return { created: 0 };
  }

  const members = await prisma.member.findMany({
    where: { orgId, id: { in: uniqueIds } },
    select: { id: true },
  });
  const existing = await prisma.trainingAssignment.findMany({
    where: { orgId, moduleId, memberId: { in: members.map((m) => m.id) } },
    select: { memberId: true },
  });
  const existingIds = new Set(existing.map((a) => a.memberId));
  const toCreate = members.filter((m) => !existingIds.has(m.id));
  if (toCreate.length > 0) {
    await prisma.trainingAssignment.createMany({
      data: toCreate.map((m) => ({
        orgId,
        memberId: m.id,
        moduleId,
        status: "NOT_STARTED",
      })),
    });
  }
  await syncTrainingModuleStats(orgId, moduleId);
  return { created: toCreate.length };
}

export async function assignModuleToAllMembers(orgId: string, moduleId: string) {
  const members = await prisma.member.findMany({
    where: { orgId },
    select: { id: true },
  });
  return assignModuleToMembers(
    orgId,
    moduleId,
    members.map((m) => m.id)
  );
}
