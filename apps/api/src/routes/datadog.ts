import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectDatadogAccount } from "../services/observability/datadog/datadog.connect.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const datadogRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/datadog/connect", async (req, reply) => {
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
      apiKey?: string;
      appKey?: string;
      site?: string;
      name?: string;
    };

    if (!body.apiKey?.trim()) {
      return reply.status(400).send(err("apiKey required"));
    }
    if (!body.appKey?.trim()) {
      return reply.status(400).send(err("appKey required"));
    }

    try {
      const result = await connectDatadogAccount({
        apiKey: body.apiKey,
        appKey: body.appKey,
        site: body.site,
        name: body.name,
        orgSlug: org.slug,
      });

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "observability.datadog.connected",
        target: result.site,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          site: result.site,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Datadog connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
