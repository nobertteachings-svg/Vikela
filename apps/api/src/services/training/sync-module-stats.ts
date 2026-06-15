import type { TrainingModuleStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/** Recompute denormalized completion counters on a training module. */
export async function syncTrainingModuleStats(orgId: string, moduleId: string) {
  const [assignments, mod] = await Promise.all([
    prisma.trainingAssignment.findMany({ where: { orgId, moduleId } }),
    prisma.trainingModule.findUnique({ where: { id: moduleId } }),
  ]);
  if (!mod) return;

  const assigned = assignments.length;
  const completed = assignments.filter((a) => a.status === "COMPLETE").length;
  const hasOverdue = assignments.some((a) => a.status === "OVERDUE");

  let status: TrainingModuleStatus = "ON_TRACK";
  if (assigned > 0 && completed === assigned) {
    status = "COMPLETE";
  } else if (hasOverdue || (mod.dueAt && mod.dueAt < new Date() && completed < assigned)) {
    status = "AT_RISK";
  }

  await prisma.trainingModule.update({
    where: { id: moduleId },
    data: { assigned, completed, status },
  });
}

export async function assignModuleToAllMembers(orgId: string, moduleId: string) {
  const members = await prisma.member.findMany({
    where: { orgId },
    select: { id: true },
  });
  const existing = await prisma.trainingAssignment.findMany({
    where: { orgId, moduleId },
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
}
