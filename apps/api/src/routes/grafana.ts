import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectGrafanaAccount } from "../services/observability/grafana/grafana.connect.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const grafanaRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/grafana/connect", async (req, reply) => {
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
      baseUrl?: string;
      apiToken?: string;
      name?: string;
    };

    if (!body.baseUrl?.trim()) {
      return reply.status(400).send(err("baseUrl required"));
    }
    if (!body.apiToken?.trim()) {
      return reply.status(400).send(err("apiToken required"));
    }

    try {
      const result = await connectGrafanaAccount({
        baseUrl: body.baseUrl,
        apiToken: body.apiToken,
        name: body.name,
        orgSlug: org.slug,
      });

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "observability.grafana.connected",
        target: result.externalId,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          baseUrl: result.baseUrl,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Grafana connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
