import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectNewRelicAccount } from "../services/observability/newrelic/newrelic.connect.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const newrelicRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/newrelic/connect", async (req, reply) => {
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

    const body = req.body as {
      userApiKey?: string;
      accountId?: string;
      region?: string;
      name?: string;
    };

    if (!body.userApiKey?.trim()) {
      return reply.status(400).send(err("userApiKey required"));
    }

    try {
      const result = await connectNewRelicAccount({
        userApiKey: body.userApiKey,
        accountId: body.accountId,
        region: body.region,
        name: body.name,
        orgSlug: org.slug,
      });

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "observability.newrelic.connected",
        target: result.accountId,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          accountId: result.accountId,
          region: result.region,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "New Relic connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
