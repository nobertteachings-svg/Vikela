import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectPagerDutyAccount } from "../services/observability/pagerduty/pagerduty.connect.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const pagerdutyRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/pagerduty/connect", async (req, reply) => {
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

    const body = req.body as { apiToken?: string; name?: string };
    if (!body.apiToken?.trim()) {
      return reply.status(400).send(err("apiToken required"));
    }

    try {
      const result = await connectPagerDutyAccount({
        apiToken: body.apiToken,
        name: body.name,
        orgSlug: org.slug,
      });

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "observability.pagerduty.connected",
        target: result.userId,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          userId: result.userId,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "PagerDuty connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
