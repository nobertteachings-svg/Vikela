import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireAdmin, requireMutation, requireRead } from "../lib/authorization.js";
import {
  generatePolicyContent,
  summarizeGapsForPolicy,
} from "../services/policy/generator.js";
import { POLICY_TITLES } from "../services/policy/templates.js";
import { getPolicyCoverage } from "../services/policy/coverage.js";
import { generatePolicyBundle } from "../services/policy/bundle.js";
import { publishPolicyAsEvidence } from "../services/policy/publish.js";
import { ingestOrgKnowledge } from "../services/rag/ingest.js";
import { assertPlanFeature } from "../lib/plan-features.js";
import type { PolicyStatus, PolicyType } from "@prisma/client";
import { getClerkAuth } from "../lib/auth.js";

async function resolveApproverLabel(orgId: string, clerkUserId?: string | null): Promise<string> {
  if (!clerkUserId) return "unknown";
  const member = await prisma.member.findUnique({
    where: { orgId_clerkId: { orgId, clerkId: clerkUserId } },
    select: { name: true, email: true },
  });
  return member?.name ?? member?.email ?? "unknown";
}

function mapPolicyEditor(p: {
  id: string;
  title: string;
  content: string;
  status: PolicyStatus;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    status: p.status,
    version: p.version,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const policiesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/policies/coverage", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    return reply.send(ok(await getPolicyCoverage(org.id)));
  });

  app.get("/policies", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const policies = await prisma.policy.findMany({
      where: { orgId: org.id },
      orderBy: { updatedAt: "desc" },
    });

    return reply.send(
      ok(
        policies.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          version: p.version,
          preview: p.content.slice(0, 200),
          updatedAt: p.updatedAt.toISOString(),
          approvedAt: p.approvedAt?.toISOString(),
        }))
      )
    );
  });

  app.get("/policies/types", async (req, reply) => {
    await requireRead(req);
    return reply.send(
      ok(
        Object.entries(POLICY_TITLES).map(([type, title]) => ({
          type,
          title,
        }))
      )
    );
  });

  app.get("/policies/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const policy = await prisma.policy.findFirst({
      where: { id, orgId: org.id },
    });
    if (!policy) return reply.status(404).send(err("Policy not found"));
    return reply.send(ok(policy));
  });

  app.get("/policies/:id/export", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const policy = await prisma.policy.findFirst({
      where: { id, orgId: org.id },
    });
    if (!policy) return reply.status(404).send(err("Policy not found"));

    const filename = `${policy.title.replace(/\s+/g, "-").toLowerCase()}-v${policy.version}.md`;
    return reply
      .header("Content-Type", "text/markdown; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(policy.content);
  });

  app.post("/policies/generate", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    try {
      assertPlanFeature(org, "policy_generator");
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan upgrade required"));
    }

    const body = req.body as {
      type: PolicyType;
      industry?: string;
      employeeCount?: string;
    };

    const gaps = await prisma.gap.findMany({
      where: { orgId: org.id, status: "OPEN", isSample: false },
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

    const content = await generatePolicyContent({
      orgName: org.name,
      type: body.type,
      industry: body.industry,
      employeeCount: body.employeeCount,
      gapSummary,
    });

    const title = POLICY_TITLES[body.type];
    const existing = await prisma.policy.findFirst({
      where: { orgId: org.id, type: body.type },
    });

    const policy = existing
      ? await prisma.policy.update({
          where: { id: existing.id },
          data: {
            content,
            version: existing.version + 1,
            status: "DRAFT",
            updatedAt: new Date(),
          },
        })
      : await prisma.policy.create({
          data: {
            orgId: org.id,
            title,
            type: body.type,
            content,
            status: "DRAFT",
          },
        });

    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok({ id: policy.id, title: policy.title, status: policy.status }));
  });

  app.post("/policies/generate-bundle", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    try {
      assertPlanFeature(org, "policy_generator");
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan upgrade required"));
    }

    const body = (req.body as { industry?: string; employeeCount?: string }) ?? {};
    const result = await generatePolicyBundle(org.id, body);
    return reply.send(ok(result));
  });

  app.post("/policies/:id/regenerate", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "policy_generator");
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan upgrade required"));
    }
    const { id } = req.params as { id: string };

    const policy = await prisma.policy.findFirst({
      where: { id, orgId: org.id },
    });
    if (!policy) return reply.status(404).send(err("Policy not found"));

    const gaps = await prisma.gap.findMany({
      where: { orgId: org.id, status: "OPEN", isSample: false },
      include: { control: true },
      take: 10,
    });

    const content = await generatePolicyContent({
      orgName: org.name,
      type: policy.type,
      gapSummary: await summarizeGapsForPolicy(
        org.name,
        gaps.map((g) => ({
          title: g.title,
          severity: g.severity,
          controlCode: g.control?.code,
        }))
      ),
    });

    const updated = await prisma.policy.update({
      where: { id },
      data: { content, version: policy.version + 1, status: "DRAFT" },
    });

    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok(mapPolicyEditor(updated)));
  });

  app.patch("/policies/:id", async (req, reply) => {
    const body = req.body as { status?: PolicyStatus; content?: string; title?: string };

    try {
      if (body.status === "APPROVED") {
        await requireAdmin(req);
      } else {
        await requireMutation(req);
      }
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.policy.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Policy not found"));

    const auth = getClerkAuth(req);
    const approver = await resolveApproverLabel(org.id, auth?.userId);

    const policy = await prisma.policy.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.content
          ? { content: body.content, version: existing.version + 1 }
          : {}),
        ...(body.title ? { title: body.title } : {}),
        ...(body.status === "APPROVED"
          ? { approvedAt: new Date(), approvedBy: approver }
          : {}),
      },
    });

    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok({ id: policy.id, status: policy.status, version: policy.version }));
  });

  app.post("/policies/:id/publish", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const auth = getClerkAuth(req);
    const approvedBy = await resolveApproverLabel(org.id, auth?.userId);
    const policy = await publishPolicyAsEvidence(id, org.id, approvedBy);
    return reply.send(ok({ id: policy.id, status: policy.status, version: policy.version }));
  });

  app.delete("/policies/:id", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.policy.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Policy not found"));

    await prisma.policy.delete({ where: { id } });
    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok({ deleted: true }));
  });
};
