import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { scanQueue } from "../jobs/scan.job.js";
import { executeCloudScan } from "../services/scanner/execute-cloud-scan.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";
import { assertCanEnqueueScan } from "../lib/plan-limits.js";
import { assertBillingAllowsUsage } from "../lib/plan-features.js";

export const cloudAccountsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/cloud-accounts", async (req, reply) => {
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
        cloudAccounts: {
          where: { isActive: true },
          include: { integration: true },
        },
      },
    });

    if (!orgFull) return reply.send(ok([]));

    const accounts = await Promise.all(
      orgFull.cloudAccounts.map(async (ca) => {
        const openGaps = await prisma.gap.count({
          where: { cloudAccountId: ca.id, status: "OPEN" },
        });
        const metadata = ca.integration.metadata as { roleArn?: string; verified?: boolean };
        return {
          id: ca.id,
          provider: ca.provider,
          accountId: ca.accountId,
          accountName: ca.accountName,
          region: ca.region,
          environment: ca.environment,
          roleArn: metadata.roleArn,
          verified: metadata.verified ?? false,
          openGaps,
          lastScannedAt: ca.lastScannedAt?.toISOString(),
          integrationId: ca.integrationId,
        };
      })
    );

    return reply.send(ok(accounts));
  });

  app.post("/cloud-accounts/:id/scan", async (req, reply) => {
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
      assertBillingAllowsUsage(org);
      await assertCanEnqueueScan(org.id, org.plan);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
    }

    const account = await prisma.cloudAccount.findFirst({
      where: { id, orgId: org.id },
    });
    if (!account) return reply.status(404).send(err("Cloud account not found"));

    if (body.async !== false) {
      const job = await scanQueue.add("cloud-scan", { type: "cloud", cloudAccountId: id });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    try {
      const result = await executeCloudScan({ cloudAccountId: id });
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Cloud scan failed"));
    }
  });
};
