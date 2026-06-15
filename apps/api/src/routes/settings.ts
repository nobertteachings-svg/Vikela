import type { FastifyPluginAsync } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { sendTestWebhookScanCompleted } from "../lib/dispatch-org-webhooks.js";
import { parseOrgSettings, type OrgSettings } from "../lib/org-settings.js";
import { isValidAllowlistEntry, normalizeAllowlist } from "../lib/ip-allowlist.js";

type OrgSettingsPayload = OrgSettings;

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/settings", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const [apiKeys, webhooks] = await Promise.all([
      prisma.apiKey.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.orgWebhook.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return reply.send(
      ok({
        settings: parseOrgSettings(org.settings),
        apiKeys: apiKeys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.keyPrefix,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        })),
        webhooks: webhooks.map((w) => ({
          id: w.id,
          name: w.name,
          url: w.url,
          events: w.events,
          isActive: w.isActive,
          createdAt: w.createdAt.toISOString(),
        })),
      })
    );
  });

  app.patch("/settings", async (req, reply) => {
    const member = await requireAdmin(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const body = req.body as Partial<OrgSettingsPayload>;
    const current = parseOrgSettings(org.settings);
    const merged: OrgSettingsPayload = {
      notifications: { ...current.notifications, ...body.notifications },
      security: { ...current.security, ...body.security },
    };

    if (body.security?.ipAllowlist) {
      const invalid = body.security.ipAllowlist.filter((entry) => !isValidAllowlistEntry(entry));
      if (invalid.length > 0) {
        return reply.status(422).send(err(`Invalid IP allowlist entries: ${invalid.join(", ")}`));
      }
      merged.security.ipAllowlist = normalizeAllowlist(body.security.ipAllowlist);
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: merged },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "settings.updated",
    });

    return reply.send(ok({ settings: merged }));
  });

  app.post("/settings/api-keys", async (req, reply) => {
    const member = await requireAdmin(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const body = req.body as { name?: string };
    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const rawKey = `vk_${randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const created = await prisma.apiKey.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        keyPrefix,
        keyHash,
      },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "api_key.created",
      target: created.id,
    });

    return reply.send(
      ok({
        id: created.id,
        name: created.name,
        prefix: keyPrefix,
        key: rawKey,
        createdAt: created.createdAt.toISOString(),
      })
    );
  });

  app.delete("/settings/api-keys/:id", async (req, reply) => {
    const member = await requireAdmin(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }
    const { id } = req.params as { id: string };

    const deleted = await prisma.apiKey.deleteMany({
      where: { id, orgId: org.id },
    });
    if (deleted.count === 0) {
      return reply.status(404).send(err("API key not found"));
    }

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "api_key.deleted",
      target: id,
    });

    return reply.send(ok({ deleted: true }));
  });

  app.post("/settings/webhooks", async (req, reply) => {
    const member = await requireAdmin(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const body = req.body as { name?: string; url?: string; events?: string[] };
    if (!body.name?.trim() || !body.url?.trim()) {
      return reply.status(400).send(err("name and url are required"));
    }

    const secret = randomBytes(16).toString("hex");
    const created = await prisma.orgWebhook.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        url: body.url.trim(),
        events: body.events?.length ? body.events : ["scan.completed", "gap.created"],
        secret,
      },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "webhook.created",
      target: created.id,
    });

    return reply.send(
      ok({
        id: created.id,
        name: created.name,
        url: created.url,
        events: created.events,
        secret,
        isActive: created.isActive,
      })
    );
  });

  app.delete("/settings/webhooks/:id", async (req, reply) => {
    const member = await requireAdmin(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }
    const { id } = req.params as { id: string };

    const deleted = await prisma.orgWebhook.deleteMany({
      where: { id, orgId: org.id },
    });
    if (deleted.count === 0) {
      return reply.status(404).send(err("Webhook not found"));
    }

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "webhook.deleted",
      target: id,
    });

    return reply.send(ok({ deleted: true }));
  });

  app.post("/settings/webhooks/:id/test", async (req, reply) => {
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
    const result = await sendTestWebhookScanCompleted(org.id, id);

    if (!result.ok) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return reply.status(status).send(err(result.error ?? "Test delivery failed"));
    }

    return reply.send(
      ok({
        delivered: true,
        scanId: result.scanId,
        httpStatus: result.status,
      })
    );
  });
};
