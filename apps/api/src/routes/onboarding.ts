import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import { getClerkAuth, isAuthEnforced, requireApiAuth } from "../lib/auth.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import {
  ensureMembershipFromSession,
  getOnboardingStatus,
} from "../lib/membership.js";
import { getLiteScanStatus, startLiteScan } from "../services/scanner/lite-scan.js";
import { resolveOrganization } from "../lib/org-context.js";
import {
  applyOnboardingRepoDefaults,
  listOnboardingRepositories,
  setOnboardingRepositorySelection,
  syncOnboardingRepositories,
} from "../services/onboarding/repository-selection.js";
import { setOnboardingFrameworkSelection } from "../services/onboarding/framework-selection.js";
import { syncOrgComplianceState } from "../lib/sync-org-compliance.js";

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/onboarding/status", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    return reply.send(ok(await getOnboardingStatus(req)));
  });

  app.post("/onboarding/ensure-membership", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }

      const auth = getClerkAuth(req);
      if (!auth?.orgId) {
        return reply.status(400).send(err("Select or create a Clerk organization first"));
      }
    }

    await ensureOrganizationFromSession(req);
    const result = await ensureMembershipFromSession(req);
    if (!result.orgReady) {
      return reply.status(202).send(
        ok({
          ...result,
          message: "Create or select a workspace in Clerk, then retry.",
        })
      );
    }

    return reply.send(ok(result));
  });

  app.get("/onboarding/repositories", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    return reply.send(ok(await listOnboardingRepositories(org.id)));
  });

  app.post("/onboarding/sync-repositories", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const synced = await syncOnboardingRepositories(org.id);
    return reply.send(ok({ synced, repositories: await listOnboardingRepositories(org.id) }));
  });

  app.put("/onboarding/repository-selection", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = (req.body as { activeRepoIds?: string[] }) ?? {};
    const activeRepoIds = Array.isArray(body.activeRepoIds) ? body.activeRepoIds : [];
    if (activeRepoIds.length === 0) {
      return reply.status(400).send(err("Select at least one repository to scan"));
    }

    const result = await setOnboardingRepositorySelection(org.id, activeRepoIds);
    return reply.send(ok(result));
  });

  app.put("/onboarding/framework-selection", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = (req.body as { slugs?: string[] }) ?? {};
    const slugs = Array.isArray(body.slugs) ? body.slugs : [];
    if (slugs.length === 0) {
      return reply.status(400).send(err("Select at least one framework"));
    }

    const result = await setOnboardingFrameworkSelection(org.id, slugs);
    await syncOrgComplianceState(org.id);
    return reply.send(ok(result));
  });

  app.post("/onboarding/lite-scan", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = (req.body as { repoId?: string }) ?? {};
    const status = await startLiteScan(org.id, body.repoId);
    return reply.send(ok(status));
  });

  app.get("/onboarding/lite-scan/status", async (req, reply) => {
    if (isAuthEnforced()) {
      try {
        requireApiAuth(req);
      } catch {
        return reply.status(401).send(err("Unauthorized"));
      }
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const query = req.query as { scanId?: string };
    if (!query.scanId) {
      return reply.status(400).send(err("scanId query parameter required"));
    }

    const status = await getLiteScanStatus(org.id, query.scanId);
    if (!status) return reply.status(404).send(err("Lite scan not found"));

    return reply.send(ok(status));
  });
};
