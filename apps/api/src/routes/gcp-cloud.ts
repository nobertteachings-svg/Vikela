import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { connectGcpCloudAccount } from "../services/cloud/gcp/gcp.connect.js";
import { getGcpCloudOAuthUrl } from "../services/cloud/gcp/gcp.cloud.oauth.js";
import { scheduleCloudAccountScan } from "../jobs/cloud-scan.schedule.js";
import { resolveOrganization } from "../lib/org-context.js";
import { isDemoConnectAllowed } from "../lib/auth.js";
import { requireAdmin } from "../lib/authorization.js";

export const gcpCloudRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/gcp/connect", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = (req.body as { accessToken?: string; projectId?: string; projectName?: string }) ?? {};

    if (!body.accessToken && !isDemoConnectAllowed()) {
      return reply
        .status(400)
        .send(err("Use GET /integrations/gcp/oauth-url to connect GCP in production"));
    }

    try {
      const result = await connectGcpCloudAccount({
        accessToken: body.accessToken ?? "demo-token",
        projectId: body.projectId ?? "demo-gcp-project",
        projectName: body.projectName ?? "GCP (Demo)",
        orgSlug: org.slug,
        req,
      });

      await scheduleCloudAccountScan(result.cloudAccount.id);

      return reply.send(
        ok({
          integrationId: result.integration.id,
          cloudAccountId: result.cloudAccount.id,
          accountId: result.cloudAccount.accountId,
        })
      );
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "GCP connect failed"));
    }
  });

  app.get("/integrations/gcp/oauth-url", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    if (!process.env.GCP_CLIENT_ID) {
      return reply.status(400).send(err("GCP_CLIENT_ID not configured"));
    }
    const state = Buffer.from(JSON.stringify({ orgSlug: org.slug })).toString("base64url");
    return reply.send(ok({ url: getGcpCloudOAuthUrl(state) }));
  });
};
