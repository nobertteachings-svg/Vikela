import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { executeCodeScan } from "../services/scanner/execute-code-scan.js";
import { scanQueue } from "../jobs/scan.job.js";
import { executeCloudScan } from "../services/scanner/execute-cloud-scan.js";
import { executeFullScan } from "../services/scanner/execute-full-scan.js";
import { resolveOrganization, requireOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";
import { assertCanEnqueueScan } from "../lib/plan-limits.js";
import { gapsFoundForScan } from "../lib/scan-query.js";

export const scansRoutes: FastifyPluginAsync = async (app) => {
  app.post("/scans/code/:repoId", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const { repoId } = req.params as { repoId: string };
    const body = (req.body as { branch?: string; async?: boolean; prNumber?: number; commitSha?: string }) ?? {};

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

    const repo = await prisma.repository.findFirst({
      where: { id: repoId, orgId: org.id },
    });
    if (!repo) return reply.status(404).send(err("Repository not found"));

    if (body.async !== false) {
      const job = await scanQueue.add("code-scan", {
        type: "code",
        repoId,
        branch: body.branch ?? repo.defaultBranch,
        prNumber: body.prNumber,
        commitSha: body.commitSha,
        postPrComments: Boolean(body.prNumber),
      });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    try {
      const result = await executeCodeScan({
        repoId,
        branch: body.branch,
        prNumber: body.prNumber,
        commitSha: body.commitSha,
        postPrComments: body.prNumber != null,
      });
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Scan failed"));
    }
  });

  app.post("/scans/cloud/:cloudAccountId", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const { cloudAccountId } = req.params as { cloudAccountId: string };
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

    const account = await prisma.cloudAccount.findFirst({
      where: { id: cloudAccountId, orgId: org.id },
      include: { integration: true, org: true },
    });

    if (!account) return reply.status(404).send(err("Cloud account not found"));

    if (body.async !== false) {
      const job = await scanQueue.add("cloud-scan", {
        type: "cloud",
        cloudAccountId,
      });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    try {
      const result = await executeCloudScan({ cloudAccountId });
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Cloud scan failed"));
    }
  });

  app.post("/scans/full", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    try {
      await assertCanEnqueueScan(org.id, org.plan);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
    }

    const body = (req.body as { async?: boolean }) ?? {};

    if (body.async !== false) {
      const job = await scanQueue.add("full-scan", { type: "full", orgId: org.id });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    try {
      const result = await executeFullScan(org.id);
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Full scan failed"));
    }
  });

  app.get("/scans", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const scans = await prisma.scan.findMany({
      where: { orgId: org.id },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        repo: true,
        cloudAccount: true,
        _count: { select: { gaps: true } },
        children: {
          select: { _count: { select: { gaps: true } } },
        },
      },
    });

    return reply.send(
      ok(
        scans.map((s) => ({
          id: s.id,
          scanType: s.scanType,
          status: s.status,
          score: s.score,
          target: s.repo?.fullName ?? s.cloudAccount?.accountName,
          branch: s.branch,
          prNumber: s.prNumber,
          gapsFound: gapsFoundForScan(s),
          isLiteScan: s.isLiteScan,
          parentScanId: s.parentScanId,
          startedAt: s.startedAt.toISOString(),
          completedAt: s.completedAt?.toISOString() ?? null,
        }))
      )
    );
  });
};
