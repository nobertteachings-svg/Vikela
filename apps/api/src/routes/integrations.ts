import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { PROVIDER_DEFINITIONS, type IntegrationProviderId } from "@vikela/shared";
import { encrypt } from "../lib/crypto.js";
import { resolveOrganization } from "../lib/org-context.js";
import { isDemoConnectAllowed } from "../lib/auth.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { assertCanConnectIntegration } from "../lib/plan-limits.js";
import { assertBillingAllowsUsage } from "../lib/plan-features.js";
import { logAuditEvent } from "../lib/audit-log.js";
import {
  awsPlatformReady,
  getProviderConnectAvailability,
} from "../lib/integration-availability.js";
import type { IntegrationCategory, IntegrationProvider, Prisma } from "@prisma/client";

export const integrationsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/integrations", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) {
      return reply.send(err("Organization not found"));
    }
    const orgFull = await prisma.organization.findFirst({
      where: { id: org.id },
      include: {
        integrations: {
          include: {
            repositories: { where: { isActive: true } },
            cloudAccounts: { where: { isActive: true } },
          },
        },
      },
    });

    if (!orgFull) {
      return reply.send(err("Organization not found"));
    }

    const connected = orgFull.integrations.map((i) => ({
      provider: i.provider,
      integrationId: i.id,
      name: i.name,
      externalId: i.externalId,
      category: i.category,
      isActive: i.isActive,
      lastSyncedAt: i.lastSyncedAt?.toISOString(),
      resourceCount:
        i.category === "GIT"
          ? i.repositories.length
          : i.category === "CLOUD"
            ? i.cloudAccounts.length
            : i.category === "IDENTITY"
              ? i.isActive
                ? 1
                : 0
              : 0,
    }));

    const statuses = PROVIDER_DEFINITIONS.map((def) => {
      const match = connected.find((c) => c.provider === def.id);
      const availability = getProviderConnectAvailability(def.id as IntegrationProviderId);
      return {
        ...def,
        connected: Boolean(match?.isActive),
        integrationId: match?.integrationId,
        name: match?.name ?? def.name,
        externalId: match?.externalId,
        resourceCount: match?.resourceCount ?? 0,
        lastSyncedAt: match?.lastSyncedAt,
        connectable: availability.connectable,
        unavailableReason: availability.reason ?? null,
        awsPlatformReady: def.id === "AWS" ? awsPlatformReady() : undefined,
      };
    });

    return reply.send(
      ok({
        providers: statuses,
        connectedCount: connected.filter((c) => c.isActive).length,
      })
    );
  });

  app.post("/integrations/:provider/connect", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const { provider } = req.params as { provider: string };
    const body = req.body as {
      name?: string;
      externalId?: string;
      accessToken?: string;
      roleArn?: string;
      metadata?: Record<string, unknown>;
    };

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const existing = await prisma.integration.findFirst({
      where: {
        orgId: org.id,
        provider: provider.toUpperCase() as IntegrationProvider,
        isActive: true,
      },
    });
    const providerId = provider.toUpperCase() as IntegrationProviderId;
    const def = PROVIDER_DEFINITIONS.find((d) => d.id === providerId);
    if (!def) return reply.status(400).send(err("Unknown provider"));

    if (!existing) {
      try {
        assertBillingAllowsUsage(org);
        await assertCanConnectIntegration(org.id, org.plan, {
          provider: providerId as IntegrationProvider,
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode ?? 402;
        return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
      }
    }

    const availability = getProviderConnectAvailability(providerId);
    if (!availability.connectable) {
      return reply
        .status(400)
        .send(
          err(
            availability.reason === "not_configured"
              ? `${def.name} is not configured on this server`
              : `${def.name} is coming soon`
          )
        );
    }

    if (!body.accessToken && !body.roleArn) {
      if (!isDemoConnectAllowed()) {
        return reply
          .status(400)
          .send(err("accessToken or roleArn required — complete OAuth or cloud setup"));
      }
    }
    const token =
      body.accessToken ??
      (body.roleArn ? "role-based" : isDemoConnectAllowed() ? "demo-token" : "");
    if (!token) {
      return reply.status(400).send(err("Missing credentials"));
    }
    const integration = await prisma.integration.upsert({
      where: {
        orgId_provider_externalId: {
          orgId: org.id,
          provider: providerId,
          externalId: body.externalId ?? "default",
        },
      },
      update: {
        isActive: true,
        accessToken: encrypt(token),
        metadata: (body.metadata ?? (body.roleArn ? { roleArn: body.roleArn } : undefined)) as Prisma.InputJsonValue,
        lastSyncedAt: new Date(),
      },
      create: {
        orgId: org.id,
        provider: providerId as IntegrationProvider,
        category: def.category as IntegrationCategory,
        name: body.name ?? def.name,
        externalId: body.externalId ?? "default",
        accessToken: encrypt(token),
        scopes: [],
        metadata: (body.metadata ?? (body.roleArn ? { roleArn: body.roleArn } : undefined)) as Prisma.InputJsonValue,
      },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "integration.connected",
      target: providerId,
    });

    return reply.send(ok({ integrationId: integration.id, provider: providerId }));
  });

  app.get("/integrations/:id/token", async (_req, reply) => {
    return reply.status(403).send(err("Token access not permitted via API"));
  });

  app.delete("/integrations/:id", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const { id } = req.params as { id: string };
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const existing = await prisma.integration.findFirst({
      where: { id, orgId: org.id },
    });
    if (!existing) {
      return reply.status(404).send(err("Integration not found"));
    }

    const meta =
      existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};
    delete meta.roleArn;
    meta.disconnectedAt = new Date().toISOString();

    await prisma.integration.update({
      where: { id: existing.id },
      data: {
        isActive: false,
        accessToken: encrypt("revoked"),
        refreshToken: null,
        tokenExpiry: null,
        metadata: meta as Prisma.InputJsonValue,
      },
    });

    // Soft-disable linked cloud accounts / repos so scans stop immediately.
    await Promise.all([
      prisma.cloudAccount.updateMany({
        where: { integrationId: existing.id, orgId: org.id },
        data: { isActive: false },
      }),
      prisma.repository.updateMany({
        where: { integrationId: existing.id, orgId: org.id },
        data: { isActive: false },
      }),
    ]);

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "integration.disconnected",
      target: id,
    });

    return reply.send(ok({ disconnected: true }));
  });
};
