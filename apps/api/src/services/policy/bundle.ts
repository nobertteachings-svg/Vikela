import type { PolicyType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { generatePolicyContent, summarizeGapsForPolicy } from "./generator.js";
import { POLICY_TITLES } from "./templates.js";
import { ingestOrgKnowledge } from "../rag/ingest.js";

const SOC2_CORE: PolicyType[] = [
  "ACCESS_CONTROL",
  "INCIDENT_RESPONSE",
  "CHANGE_MANAGEMENT",
  "DATA_RETENTION",
  "VENDOR_MANAGEMENT",
  "ACCEPTABLE_USE",
];

export async function generatePolicyBundle(
  orgId: string,
  options?: { industry?: string; employeeCount?: string }
): Promise<{ created: string[]; skipped: string[] }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  const gaps = await prisma.gap.findMany({
    where: { orgId, status: "OPEN", isSample: false },
    include: { control: true },
    take: 10,
  });

  const gapSummary = await summarizeGapsForPolicy(
    org.name,
    gaps.map((g) => ({
      title: g.title,
      severity: g.severity,
      controlCode: g.control?.code,
    }))
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const type of SOC2_CORE) {
    const existing = await prisma.policy.findFirst({
      where: { orgId, type },
    });
    if (existing) {
      skipped.push(type);
      continue;
    }

    const content = await generatePolicyContent({
      orgName: org.name,
      type,
      industry: options?.industry,
      employeeCount: options?.employeeCount,
      gapSummary,
    });

    await prisma.policy.create({
      data: {
        orgId,
        title: POLICY_TITLES[type],
        type,
        content,
        status: "DRAFT",
      },
    });
    created.push(type);
  }

  ingestOrgKnowledge(orgId).catch(() => {});
  return { created, skipped };
}
