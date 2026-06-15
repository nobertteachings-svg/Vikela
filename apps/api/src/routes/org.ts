import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const orgRoutes: FastifyPluginAsync = async (app) => {
  app.patch("/org", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = req.body as { name?: string };
    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { name: body.name.trim() },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "org.updated",
    });

    return reply.send(
      ok({
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
      })
    );
  });

  app.get("/org", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const [integrations, gaps, members] = await Promise.all([
      prisma.integration.count({ where: { orgId: org.id, isActive: true } }),
      prisma.gap.count({ where: { orgId: org.id, status: "OPEN" } }),
      prisma.member.count({ where: { orgId: org.id } }),
    ]);

    return reply.send(
      ok({
        id: org.id,
        name: org.name,
        slug: org.slug,
        clerkOrgId: org.clerkOrgId,
        plan: org.plan,
        connectedIntegrations: integrations,
        openGaps: gaps,
        memberCount: members,
      })
    );
  });
};
