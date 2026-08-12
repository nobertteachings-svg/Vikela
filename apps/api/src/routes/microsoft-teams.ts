import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectMicrosoftTeamsAccount } from "../services/communication/teams/teams.connect.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const microsoftTeamsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/microsoft-teams/connect", async (req, reply) => {
    try {
      await ensureOrganizationFromSession(req);
      await ensureMembershipFromSession(req);
    } catch {
      /* header / sole-membership resolution may still succeed below */
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const body = req.body as { webhookUrl?: string; name?: string };
    if (!body.webhookUrl?.trim()) {
      return reply.status(400).send(err("webhookUrl required"));
    }

    try {
      const result = await connectMicrosoftTeamsAccount({
        webhookUrl: body.webhookUrl,
        name: body.name,
        orgSlug: org.slug,
      });

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "communication.microsoft_teams.connected",
        target: result.integration.id,
      });

      return reply.send(ok({ integrationId: result.integration.id }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Microsoft Teams connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
