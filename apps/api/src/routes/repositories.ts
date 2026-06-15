import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { syncGitRepositories } from "../services/git/sync-repositories.js";
import { scanQueue } from "../jobs/scan.job.js";
import { resolveOrganization, requireOrganization } from "../lib/org-context.js";
import { requireAdmin, requireMutation, requireRead } from "../lib/authorization.js";
import { assertCanEnqueueScan } from "../lib/plan-limits.js";

export const repositoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/repositories", async (req, reply) => {
    await requireRead(req);
    const resolved = await resolveOrganization(req);
    if (!resolved) return reply.send(ok([]));

    const org = await prisma.organization.findFirst({
      where: { id: resolved.id },
      include: {
        repositories: {
          where: { isActive: true },
          include: { integration: true },
          orderBy: { fullName: "asc" },
        },
      },
    });

    if (!org) return reply.send(ok([]));

    return reply.send(
      ok(
        org.repositories.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.fullName,
          defaultBranch: r.defaultBranch,
          provider: r.integration.provider,
          lastScannedAt: r.lastScannedAt?.toISOString(),
          isPrivate: r.isPrivate,
        }))
      )
    );
  });

  app.post("/integrations/:id/sync-repos", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const integration = await prisma.integration.findFirst({
      where: { id, orgId: org.id, isActive: true },
    });
    if (!integration) {
      return reply.status(404).send(err("Integration not found"));
    }

    try {
      const count = await syncGitRepositories(id);
      return reply.send(ok({ synced: count }));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Sync failed"));
    }
  });

  app.post("/repositories/:id/scan", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

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

    const { id } = req.params as { id: string };
    const body = (req.body as { branch?: string; async?: boolean }) ?? {};

    const repo = await prisma.repository.findFirst({
      where: { id, orgId: org.id },
    });
    if (!repo) return reply.status(404).send(err("Repository not found"));

    if (body.async !== false) {
      const job = await scanQueue.add("code-scan", {
        type: "code",
        repoId: repo.id,
        branch: body.branch ?? repo.defaultBranch,
      });
      return reply.send(ok({ queued: true, jobId: job.id }));
    }

    const { executeCodeScan } = await import("../services/scanner/execute-code-scan.js");
    const result = await executeCodeScan({
      repoId: repo.id,
      branch: body.branch,
      postPrComments: false,
    });
    return reply.send(ok(result));
  });
};
