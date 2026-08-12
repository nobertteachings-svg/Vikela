import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireRead } from "../lib/authorization.js";

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get("/audit-events", async (req, reply) => {
    const org = await resolveOrganization(req);
    if (!org) {
      return reply.status(401).send(err("Organization required"));
    }
    await requireRead(req);

    const query = req.query as { limit?: string; cursor?: string };
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

    const events = await prisma.auditEvent.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor },
          }
        : {}),
      select: {
        id: true,
        actorId: true,
        action: true,
        target: true,
        metadata: true,
        createdAt: true,
      },
    });

    const actorIds = [...new Set(events.map((e) => e.actorId).filter(Boolean))] as string[];
    const members =
      actorIds.length > 0
        ? await prisma.member.findMany({
            where: { orgId: org.id, id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const byId = new Map(members.map((m) => [m.id, m]));

    return reply.send(
      ok({
        events: events.map((e) => ({
          id: e.id,
          action: e.action,
          target: e.target,
          metadata: e.metadata,
          createdAt: e.createdAt.toISOString(),
          actor: e.actorId
            ? {
                id: e.actorId,
                name: byId.get(e.actorId)?.name ?? null,
                email: byId.get(e.actorId)?.email ?? null,
              }
            : null,
        })),
      })
    );
  });
};
