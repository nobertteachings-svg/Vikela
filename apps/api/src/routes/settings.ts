import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { sendTestWebhookScanCompleted } from "../lib/dispatch-org-webhooks.js";
import { parseOrgSettings, mergeOrgSettingsJson, type OrgSettings } from "../lib/org-settings.js";
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
    const mergedParsed: OrgSettingsPayload = {
      notifications: { ...current.notifications, ...body.notifications },
      security: { ...current.security, ...body.security },
      trust: { ...current.trust, ...body.trust },
    };

    if (body.security?.ipAllowlist) {
      const invalid = body.security.ipAllowlist.filter((entry) => !isValidAllowlistEntry(entry));
      if (invalid.length > 0) {
        return reply.status(422).send(err(`Invalid IP allowlist entries: ${invalid.join(", ")}`));
      }
      mergedParsed.security.ipAllowlist = normalizeAllowlist(body.security.ipAllowlist);
    }

    if (typeof body.trust?.tagline === "string") {
      mergedParsed.trust.tagline = body.trust.tagline.trim().slice(0, 280);
    }

    const merged = mergeOrgSettingsJson(org.settings, mergedParsed);

    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: merged as Prisma.InputJsonValue },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "settings.updated",
    });

    return reply.send(ok({ settings: mergedParsed }));
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

    // Structural failures (missing webhook / no scan payload) stay as API errors.
    if (!result.scanId) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return reply.status(status).send(err(result.error ?? "Test delivery failed"));
    }

    // Delivery was attempted, always return data so the UI can distinguish
    // accepted vs "reached host but remote rejected" vs network failure.
    return reply.send(
      ok({
        delivered: result.reached,
        accepted: result.ok,
        scanId: result.scanId,
        httpStatus: result.status ?? null,
        error: result.error ?? null,
        message: result.ok
          ? `Test accepted by endpoint (HTTP ${result.status})`
          : result.reached
            ? `Delivered to endpoint, but it rejected the request (HTTP ${result.status}). Check the URL accepts POST and returns 2xx.`
            : `Could not reach the endpoint: ${result.error ?? "network error"}`,
      })
    );
  });

  app.get("/settings/export", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const format = String((req.query as { format?: string }).format ?? "json").toLowerCase();
    if (!["json", "csv", "pdf"].includes(format)) {
      return reply.status(400).send(err("format must be json, csv, or pdf"));
    }

    const [gaps, scans, evidence, policies, frameworks] = await Promise.all([
      prisma.gap.findMany({
        where: { orgId: org.id },
        orderBy: { createdAt: "desc" },
        take: 5000,
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          source: true,
          filePath: true,
          createdAt: true,
        },
      }),
      prisma.scan.findMany({
        where: { orgId: org.id },
        orderBy: { startedAt: "desc" },
        take: 500,
        select: {
          id: true,
          scanType: true,
          status: true,
          score: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.evidence.findMany({
        where: { orgId: org.id },
        orderBy: { collectedAt: "desc" },
        take: 2000,
        select: { id: true, title: true, type: true, source: true, collectedAt: true },
      }),
      prisma.policy.findMany({
        where: { orgId: org.id },
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
      prisma.orgFramework.findMany({
        where: { orgId: org.id },
        include: { framework: { select: { name: true, slug: true } } },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      organization: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
      frameworks: frameworks.map((f) => ({
        name: f.framework.name,
        slug: f.framework.slug,
        status: f.status,
      })),
      gaps,
      scans,
      evidence,
      policies,
    };

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "json") {
      return reply
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="shieldoq-export-${stamp}.json"`)
        .send(JSON.stringify(payload, null, 2));
    }

    if (format === "csv") {
      const lines = [
        "type,id,title,severity_or_status,extra,created_at", ...gaps.map(
          (g) =>
            `gap,${g.id},${csvEscape(g.title)},${g.severity},${g.status},${g.createdAt.toISOString()}`
        ), ...scans.map(
          (s) =>
            `scan,${s.id},${s.scanType},${s.status},${s.score ?? ""},${s.startedAt.toISOString()}`
        ), ...evidence.map(
          (e) =>
            `evidence,${e.id},${csvEscape(e.title)},${e.type},${e.source},${e.collectedAt.toISOString()}`
        ),
      ];
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="shieldoq-export-${stamp}.csv"`)
        .send(lines.join("\n"));
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Shieldoq export, ${org.name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;color:#222}h1{font-size:1.4rem}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ddd;padding:6px;text-align:left}</style></head><body>
<h1>${escapeHtml(org.name)}, workspace export</h1>
<p>Exported ${payload.exportedAt}. Print this page to PDF.</p>
<h2>Gaps (${gaps.length})</h2>
<table><tr><th>Severity</th><th>Title</th><th>Status</th></tr>
${gaps
  .slice(0, 200)
  .map(
    (g) =>
      `<tr><td>${g.severity}</td><td>${escapeHtml(g.title)}</td><td>${g.status}</td></tr>`
  )
  .join("")}
</table>
<script>window.onload=()=>window.print()</script>
</body></html>`;

    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="shieldoq-export-${stamp}.html"`)
      .send(html);
  });
};

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
