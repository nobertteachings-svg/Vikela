import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { scanQueue } from "../jobs/scan.job.js";
import { executeIdentityScan } from "../services/scanner/execute-identity-scan.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireAdmin, requireMutation, requireRead } from "../lib/authorization.js";
import { assertCanEnqueueScan } from "../lib/plan-limits.js";
import { connectAuth0Account, isAuth0Configured } from "../services/identity/auth0/auth0.connect.js";
import { connectJumpCloudAccount } from "../services/identity/jumpcloud/jumpcloud.connect.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";

export const identityRoutes: FastifyPluginAsync = async (app) => {
  app.get("/identity-integrations", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const orgFull = await prisma.organization.findFirst({
      where: { id: org.id },
      include: {
        integrations: {
          where: { category: "IDENTITY", isActive: true },
        },
      },
    });

    if (!orgFull) return reply.send(ok([]));

    const items = await Promise.all(
      orgFull.integrations.map(async (i) => {
        const openGaps = await prisma.gap.count({
          where: {
            orgId: orgFull.id,
            scan: { integrationId: i.id },
            status: "OPEN",
            source: "IAM",
          },
        });
        const lastScan = await prisma.scan.findFirst({
          where: { integrationId: i.id, scanType: "IDENTITY" },
          orderBy: { startedAt: "desc" },
        });
        return {
          id: i.id,
          provider: i.provider,
          name: i.name,
          externalId: i.externalId,
          metadata: i.metadata,
          openGaps,
          lastScannedAt: i.lastSyncedAt?.toISOString(),
          lastScanScore: lastScan?.score,
          lastScanStatus: lastScan?.status,
        };
      })
    );

    return reply.send(ok(items));
  });

  app.post("/identity-integrations/:id/scan", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const { id } = req.params as { id: string };
    const body = (req.body as { async?: boolean }) ?? {};

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    try {
      await assertCanEnqueueScan(org.id, org.plan);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
    }

    const integration = await prisma.integration.findFirst({
      where: { id, orgId: org.id },
    });
    if (!integration) return reply.status(404).send(err("Integration not found"));
    if (integration.category !== "IDENTITY") {
      return reply.status(400).send(err("Not an identity integration"));
    }

    if (body.async !== false) {
      const job = await scanQueue.add("identity-scan", { type: "identity", integrationId: id });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    try {
      const result = await executeIdentityScan({ integrationId: id });
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Identity scan failed"));
    }
  });

  app.post("/identity/jumpcloud/connect", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const body = req.body as { apiKey?: string; name?: string };
    if (!body.apiKey?.trim()) return reply.status(400).send(err("apiKey required"));

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    try {
      const result = await connectJumpCloudAccount({
        apiKey: body.apiKey,
        name: body.name,
        orgSlug: org.slug,
      });
      return reply.send(ok({ integrationId: result.integration.id }));
    } catch (e) {
      const message = e instanceof Error ? e.message : "JumpCloud connect failed";
      const status =
        message.includes("Plan limit") || message.includes("Integration limit") ? 402 : 400;
      return reply.status(status).send(err(message));
    }
  });

  app.post("/identity/auth0/connect", async (req, reply) => {
    if (!isAuth0Configured()) {
      return reply
        .status(503)
        .send(
          err(
            "Auth0 is not configured — set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET on the API"
          )
        );
    }

    const body = req.body as { domain?: string; name?: string };
    if (!body.domain?.trim()) {
      return reply.status(400).send(err("domain required (e.g. your-tenant.us.auth0.com)"));
    }

    // Provision org/membership before admin check (same pattern as AWS connect).
    try {
      await ensureOrganizationFromSession(req);
      await ensureMembershipFromSession(req);
    } catch {
      /* header / membership resolution may still succeed below */
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply
        .status(404)
        .send(
          err(
            "Organization not found — select Optic Inc in the org switcher, refresh /integrations, then try again."
          )
        );
    }

    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    try {
      const result = await connectAuth0Account({
        domain: body.domain,
        orgSlug: org.slug,
        name: body.name,
      });
      return reply.send(ok(result));
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 400;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Auth0 connect failed"));
    }
  });
};
