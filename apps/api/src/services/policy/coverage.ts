import { prisma } from "../../lib/prisma.js";
import { POLICY_TITLES } from "./templates.js";
import type { PolicyType } from "@prisma/client";

export async function getPolicyCoverage(orgId: string) {
  const policies = await prisma.policy.findMany({
    where: { orgId },
    select: { type: true, status: true, id: true, title: true, updatedAt: true },
  });

  const byType = new Map(policies.map((p) => [p.type, p]));

  const templates = Object.entries(POLICY_TITLES).map(([type, title]) => {
    const p = byType.get(type as PolicyType);
    return {
      type,
      title,
      hasPolicy: Boolean(p),
      policyId: p?.id,
      status: p?.status ?? null,
      updatedAt: p?.updatedAt?.toISOString(),
    };
  });

  const filled = templates.filter((t) => t.hasPolicy).length;

  return {
    totalTemplates: templates.length,
    policiesCreated: filled,
    coveragePercent: Math.round((filled / templates.length) * 100),
    approvedCount: policies.filter((p) => p.status === "APPROVED" || p.status === "PUBLISHED")
      .length,
    templates,
  };
}
