import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import {
  connectAzureCloudDemo,
  getAzureCloudOAuthUrl,
} from "../services/cloud/azure/azure.cloud.oauth.js";
import { scheduleCloudAccountScan } from "../jobs/cloud-scan.schedule.js";
import { resolveOrganization } from "../lib/org-context.js";
import { isDemoConnectAllowed } from "../lib/auth.js";
import { requireAdmin } from "../lib/authorization.js";

export const azureCloudRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/azure/connect", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    if (!isDemoConnectAllowed()) {
      return reply
        .status(400)
        .send(err("Use GET /integrations/azure/oauth-url to connect Azure in production"));
    }

    try {
      const result = await connectAzureCloudDemo(org.slug);

      await scheduleCloudAccountScan(result.cloudAccount.id);

      return reply.send(
        ok({
          integrationId: result.integration.id,
          cloudAccountId: result.cloudAccount.id,
          accountId: result.cloudAccount.accountId,
        })
      );
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Azure connect failed"));
    }
  });

  app.get("/integrations/azure/oauth-url", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    if (!process.env.AZURE_CLIENT_ID) {
      return reply.status(400).send(err("AZURE_CLIENT_ID not configured"));
    }
    const state = Buffer.from(JSON.stringify({ orgSlug: org.slug })).toString("base64url");
    return reply.send(ok({ url: getAzureCloudOAuthUrl(state) }));
  });
};
