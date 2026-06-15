import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireRead, requireAdmin } from "../lib/authorization.js";
import { computeFrameworkScoresForOrg } from "../lib/framework-score.js";
import { enrollOrgInFramework, unenrollOrgFromFramework } from "../lib/enroll-org-framework.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { syncOrgComplianceState } from "../lib/sync-org-compliance.js";

export const frameworksRoutes: FastifyPluginAsync = async (app) => {
  app.get("/frameworks", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);

    const frameworks = await prisma.framework.findMany({
      where: { isActive: true },
      include: {
        controls: { include: { control: true } },
        orgFrameworks: org ? { where: { orgId: org.id } } : false,
      },
      orderBy: { name: "asc" },
    });

    const frameworkIds = frameworks.map((f) => f.id);
    const scores = org ? await computeFrameworkScoresForOrg(org.id, frameworkIds) : new Map<string, number>();

    const data = frameworks.map((f) => {
      const orgFw = f.orgFrameworks[0];
      return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        description: f.description,
        version: f.version,
        controlCount: f.controls.length,
        score: org ? (scores.get(f.id) ?? 0) : 0,
        enrolled: Boolean(orgFw),
        status: orgFw?.status ?? "NOT_STARTED",
      };
    });

    return reply.send(ok(data));
  });

  app.post("/frameworks/:slug/enroll", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const { slug } = req.params as { slug: string };
    const framework = await prisma.framework.findFirst({
      where: { slug, isActive: true },
      include: { _count: { select: { controls: true } } },
    });

    if (!framework) {
      return reply.status(404).send(err("Framework not found"));
    }

    const { orgFramework, controlsCreated } = await enrollOrgInFramework(org.id, framework.id);

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "framework.enrolled",
      target: framework.id,
      metadata: { slug: framework.slug, name: framework.name, controlsCreated },
    });

    await syncOrgComplianceState(org.id);

    return reply.send(
      ok({
        frameworkId: framework.id,
        slug: framework.slug,
        enrolled: true,
        controlsCreated,
        status: orgFramework.status,
      })
    );
  });

  app.delete("/frameworks/:slug/enroll", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const { slug } = req.params as { slug: string };
    const framework = await prisma.framework.findFirst({
      where: { slug, isActive: true },
    });
    if (!framework) {
      return reply.status(404).send(err("Framework not found"));
    }

    const result = await unenrollOrgFromFramework(org.id, framework.id);
    if (!result.removed) {
      return reply.status(404).send(err("Framework is not enabled for this organization"));
    }

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "framework.unenrolled",
      target: framework.id,
      metadata: {
        slug: framework.slug,
        name: framework.name,
        controlsRemoved: result.controlsRemoved,
        controlsRetained: result.controlsRetained,
      },
    });

    await syncOrgComplianceState(org.id);

    return reply.send(
      ok({
        frameworkId: framework.id,
        slug: framework.slug,
        enrolled: false,
        controlsRemoved: result.controlsRemoved,
        controlsRetained: result.controlsRetained,
      })
    );
  });
};
