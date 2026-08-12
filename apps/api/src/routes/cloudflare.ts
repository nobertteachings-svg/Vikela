import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectCloudflareAccount } from "../services/cloud/cloudflare/cloudflare.connect.js";
import { scheduleCloudAccountScan } from "../jobs/cloud-scan.schedule.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";

export const cloudflareRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/cloudflare/connect", async (req, reply) => {
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
      apiToken?: string;
      accountId?: string;
      name?: string;
      scheduleDailyScan?: boolean;
    };

    if (!body.apiToken?.trim()) {
      return reply.status(400).send(err("apiToken required"));
    }

    try {
      const result = await connectCloudflareAccount({
        apiToken: body.apiToken,
        accountId: body.accountId,
        accountName: body.name,
        orgSlug: org.slug,
      });

      if (body.scheduleDailyScan !== false) {
        await scheduleCloudAccountScan(result.cloudAccount.id);
      }

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "cloud.cloudflare.connected",
        target: result.accountId,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          cloudAccountId: result.cloudAccount.id,
          accountId: result.accountId,
          accountName: result.accountName,
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cloudflare connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });
};
