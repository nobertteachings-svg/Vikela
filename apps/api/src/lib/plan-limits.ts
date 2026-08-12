import type { IntegrationProvider, Plan } from "@prisma/client";
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

/** UTC start of the current calendar month (plan meters use UTC). */
export function utcStartOfMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/** Billable scans only — child rows under a FULL parent must not inflate quota. */
function billableScanWhere(orgId: string, since: Date) {
  return {
    orgId,
    parentScanId: null as string | null,
    startedAt: { gte: since },
  };
}

function planLimitError(message: string): never {
  const err = new Error(message);
  (err as { statusCode?: number }).statusCode = 402;
  throw err;
}

export async function assertCanInviteMember(orgId: string, plan: Plan): Promise<void> {
  const limits = getPlanLimits(plan);
  const [memberCount, pendingCount] = await Promise.all([
    prisma.member.count({ where: { orgId } }),
    prisma.pendingInvite.count({
      where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  // Pending invites reserve seats until they expire or are revoked.
  if (memberCount + pendingCount >= limits.seats) {
    planLimitError(
      `Seat limit reached (${limits.seats} on ${plan}: ${memberCount} members + ${pendingCount} pending invites). Upgrade your plan or revoke an invite.`
    );
  }
}

/**
 * Enforce plan integration caps.
 * Reconnecting an already-active provider never consumes an extra slot.
 * Caps are by distinct provider (two GitHub installs still count as one provider).
 */
export async function assertCanConnectIntegration(
  orgId: string,
  plan: Plan,
  opts?: { provider?: IntegrationProvider }
): Promise<void> {
  if (opts?.provider) {
    const existing = await prisma.integration.findFirst({
      where: { orgId, provider: opts.provider, isActive: true },
      select: { id: true },
    });
    if (existing) return;
  }

  const limits = getPlanLimits(plan);
  const activeProviders = await prisma.integration.groupBy({
    by: ["provider"],
    where: { orgId, isActive: true },
  });
  if (activeProviders.length >= limits.integrations) {
    planLimitError(
      `Integration limit reached (${limits.integrations} on ${plan}). Upgrade to connect more providers.`
    );
  }
}

export async function assertCanEnqueueScan(orgId: string, plan: Plan): Promise<void> {
  const limits = getPlanLimits(plan);
  const startOfMonth = utcStartOfMonth();

  const count = await prisma.scan.count({
    where: billableScanWhere(orgId, startOfMonth),
  });
  if (count >= limits.scansPerMonth) {
    planLimitError(
      `Monthly scan limit reached (${limits.scansPerMonth} on ${plan}). Upgrade for more scans.`
    );
  }
}

export async function getOrgUsage(orgId: string, plan: Plan) {
  const limits = getPlanLimits(plan);
  const startOfMonth = utcStartOfMonth();

  const [members, activeProviders, scansThisMonth, evidenceCount, openGaps] =
    await Promise.all([
      prisma.member.count({ where: { orgId } }),
      prisma.integration.groupBy({
        by: ["provider"],
        where: { orgId, isActive: true },
      }),
      prisma.scan.count({ where: billableScanWhere(orgId, startOfMonth) }),
      prisma.evidence.count({ where: { orgId } }),
      prisma.gap.count({ where: { orgId, status: "OPEN" } }),
    ]);

  const integrations = activeProviders.length;

  return {
    seats: { used: members, limit: limits.seats },
    integrations: { used: integrations, limit: limits.integrations },
    scans: { used: scansThisMonth, limit: limits.scansPerMonth },
    evidence: { used: evidenceCount, limit: null as number | null },
    openGaps,
    storageMb: { used: evidenceCount * 2, limit: limits.evidenceStorageMb },
  };
}
