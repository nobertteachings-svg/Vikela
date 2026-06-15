import { prisma } from "../../lib/prisma.js";
import { ingestOrgKnowledge } from "../rag/ingest.js";

/** Approve policy and file as POLICY-type evidence for auditors. */
export async function publishPolicyAsEvidence(
  policyId: string,
  orgId: string,
  approvedBy?: string
) {
  const policy = await prisma.policy.findFirst({
    where: { id: policyId, orgId },
  });
  if (!policy) throw new Error("Policy not found");

  const updated = await prisma.policy.update({
    where: { id: policyId },
    data: {
      status: "PUBLISHED",
      approvedBy: approvedBy ?? "unknown",
      approvedAt: new Date(),
      version: policy.version + 1,
    },
  });

  const existingEvidence = await prisma.evidence.findFirst({
    where: { orgId, title: `Policy: ${policy.title}`, type: "POLICY" },
  });

  if (!existingEvidence) {
    await prisma.evidence.create({
      data: {
        orgId,
        title: `Policy: ${policy.title}`,
        description: `Published ${policy.type} policy v${updated.version}`,
        type: "POLICY",
        source: "MANUAL",
        isAutoCollected: true,
      },
    });
  }

  ingestOrgKnowledge(orgId).catch(() => {});
  return updated;
}
