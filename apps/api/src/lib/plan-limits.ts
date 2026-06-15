import type { Plan } from "@prisma/client";
import { prisma } from "./prisma.js";

export type PlanLimitConfig = {
  seats: number;
  integrations: number;
  scansPerMonth: number;
  evidenceStorageMb: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimitConfig> = {
  FREE: { seats: 3, integrations: 1, scansPerMonth: 5, evidenceStorageMb: 100 },
  STARTER: { seats: 10, integrations: 5, scansPerMonth: 50, evidenceStorageMb: 1024 },
  GROWTH: { seats: 25, integrations: 20, scansPerMonth: 500, evidenceStorageMb: 5120 },
  ENTERPRISE: { seats: 100, integrations: 999, scansPerMonth: 99999, evidenceStorageMb: 51200 },
};

export function getPlanLimits(plan: Plan): PlanLimitConfig {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}

function planLimitError(message: string): never {
  const err = new Error(message);
  (err as { statusCode?: number }).statusCode = 402;
  throw err;
}

export async function assertCanInviteMember(orgId: string, plan: Plan): Promise<void> {
  const limits = getPlanLimits(plan);
  const count = await prisma.member.count({ where: { orgId } });
  if (count >= limits.seats) {
    planLimitError(
      `Seat limit reached (${limits.seats} on ${plan}). Upgrade your plan to invite more members.`
    );
  }
}

export async function assertCanConnectIntegration(orgId: string, plan: Plan): Promise<void> {
  const limits = getPlanLimits(plan);
  const count = await prisma.integration.count({
    where: { orgId, isActive: true },
  });
  if (count >= limits.integrations) {
    planLimitError(
      `Integration limit reached (${limits.integrations} on ${plan}). Upgrade to connect more providers.`
    );
  }
}

export async function assertCanEnqueueScan(orgId: string, plan: Plan): Promise<void> {
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.scan.count({
    where: { orgId, startedAt: { gte: startOfMonth } },
  });
  if (count >= limits.scansPerMonth) {
    planLimitError(
      `Monthly scan limit reached (${limits.scansPerMonth} on ${plan}). Upgrade for more scans.`
    );
  }
}

export async function getOrgUsage(orgId: string, plan: Plan) {
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [members, integrations, scansThisMonth, evidenceCount, openGaps] =
    await Promise.all([
      prisma.member.count({ where: { orgId } }),
      prisma.integration.count({ where: { orgId, isActive: true } }),
      prisma.scan.count({ where: { orgId, startedAt: { gte: startOfMonth } } }),
      prisma.evidence.count({ where: { orgId } }),
      prisma.gap.count({ where: { orgId, status: "OPEN" } }),
    ]);

  return {
    seats: { used: members, limit: limits.seats },
    integrations: { used: integrations, limit: limits.integrations },
    scans: { used: scansThisMonth, limit: limits.scansPerMonth },
    evidence: { used: evidenceCount, limit: null as number | null },
    openGaps,
    storageMb: { used: evidenceCount * 2, limit: limits.evidenceStorageMb },
  };
}
