import type { FastifyPluginAsync } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { getAdminEmails } from "../lib/notify-helpers.js";
import { sendEmail, escapeHtml } from "../lib/email.js";
import { mergeOrgSettingsJson, parseOrgSettings } from "../lib/org-settings.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Simple per-slug+IP report-request throttle (in-memory; resets on process restart). */
const reportHits = new Map<string, { count: number; resetAt: number }>();
const REPORT_WINDOW_MS = 60 * 60 * 1000;
const REPORT_MAX_PER_WINDOW = 8;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function allowReportRequest(key: string): boolean {
  const now = Date.now();
  const row = reportHits.get(key);
  if (!row || now > row.resetAt) {
    reportHits.set(key, { count: 1, resetAt: now + REPORT_WINDOW_MS });
    return true;
  }
  if (row.count >= REPORT_MAX_PER_WINDOW) return false;
  row.count += 1;
  return true;
}

async function trustPayloadForOrg(
  org: {
    id: string;
    name: string;
    slug: string;
    updatedAt: Date;
    settings: unknown;
  },
  options: { includeScores: boolean; tagline: string }
) {
  const [frameworks, policies] = await Promise.all([
    prisma.orgFramework.findMany({
      where: { orgId: org.id },
      include: { framework: true },
      orderBy: { framework: { name: "asc" } },
    }),
    prisma.policy.findMany({
      where: {
        orgId: org.id,
        status: { in: ["PUBLISHED", "APPROVED"] },
      },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    name: org.name,
    slug: org.slug,
    tagline: options.tagline || null,
    updatedAt: org.updatedAt.toISOString(),
    frameworks: frameworks.map((f) => ({
      id: f.id,
      name: f.framework.name,
      slug: f.framework.slug,
      ...(options.includeScores ? { score: f.score ?? 0 } : {}),
    })),
    policies: policies.map((p) => ({
      id: p.id,
      title: p.title,
    })),
    shareUrl: `${APP_URL}/trust/${org.slug}`,
  };
}

export const trustRoutes: FastifyPluginAsync = async (app) => {
  /** Authenticated trust settings + preview payload for admins/members. */
  app.get("/trust", async (req, reply) => {
    await requireRead(req);
    const org = await requireOrganization(req);
    const parsed = parseOrgSettings(org.settings);
    const payload = await trustPayloadForOrg(org, {
      includeScores: true,
      tagline: parsed.trust.tagline,
    });
    const requests = Array.isArray(
      org.settings && typeof org.settings === "object"
        ? (org.settings as Record<string, unknown>).trustReportRequests
        : null
    )
      ? ((org.settings as Record<string, unknown>).trustReportRequests as unknown[])
      : [];

    return reply.send(
      ok({
        ...payload,
        settings: parsed.trust,
        recentRequests: requests.slice(-10).reverse(),
      })
    );
  });

  app.patch("/trust/settings", async (req, reply) => {
    const member = await requireAdmin(req);
    const org = await requireOrganization(req);
    const body = (req.body ?? {}) as {
      published?: boolean;
      showScores?: boolean;
      tagline?: string;
    };

    const current = parseOrgSettings(org.settings);
    const next = {
      ...current,
      trust: {
        published:
          typeof body.published === "boolean" ? body.published : current.trust.published,
        showScores:
          typeof body.showScores === "boolean" ? body.showScores : current.trust.showScores,
        tagline:
          typeof body.tagline === "string"
            ? body.tagline.trim().slice(0, 280)
            : current.trust.tagline,
      },
    };

    const merged = mergeOrgSettingsJson(org.settings, next);
    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: merged as Prisma.InputJsonValue },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: next.trust.published ? "trust.published" : "trust.settings_updated",
      metadata: { trust: next.trust },
    });

    return reply.send(ok({ settings: next.trust }));
  });

  /** Visitor trust center, only when published. */
  app.get("/public/trust/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, updatedAt: true, settings: true },
    });
    if (!org) {
      return reply.status(404).send(err("Trust center not found"));
    }

    const trust = parseOrgSettings(org.settings).trust;
    if (!trust.published) {
      return reply.status(404).send(err("Trust center not found"));
    }

    return reply.send(
      ok(
        await trustPayloadForOrg(org, {
          includeScores: trust.showScores,
          tagline: trust.tagline,
        })
      )
    );
  });

  /** Visitor report request, published centers only. */
  app.post("/public/trust/:slug/report-request", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = (req.body ?? {}) as {
      email?: string;
      company?: string;
      note?: string;
      website?: string; // honeypot
    };

    // Bots filling hidden honeypot → pretend success
    if (typeof body.website === "string" && body.website.trim()) {
      return reply.send(ok({ received: true, message: "Request received." }));
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!isValidEmail(email)) {
      return reply.status(400).send(err("Enter a valid work email"));
    }

    const ip =
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : undefined) ||
      req.ip ||
      "unknown";
    if (!allowReportRequest(`${slug}:${ip}`)) {
      return reply
        .status(429)
        .send(err("Too many requests from this network. Try again later."));
    }

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, settings: true },
    });
    if (!org) {
      return reply.status(404).send(err("Trust center not found"));
    }

    const trust = parseOrgSettings(org.settings).trust;
    if (!trust.published) {
      return reply.status(404).send(err("Trust center not found"));
    }

    const company = typeof body.company === "string" ? body.company.trim().slice(0, 200) : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

    const settings =
      org.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
        ? { ...(org.settings as Record<string, unknown>) }
        : {};
    const prior = Array.isArray(settings.trustReportRequests)
      ? (settings.trustReportRequests as unknown[])
      : [];
    const entry = {
      email,
      company: company || null,
      note: note || null,
      createdAt: new Date().toISOString(),
    };
    settings.trustReportRequests = [...prior.slice(-49), entry];

    await prisma.organization.update({
      where: { id: org.id },
      data: { settings: settings as Prisma.InputJsonValue },
    });

    await logAuditEvent({
      orgId: org.id,
      action: "trust.report_requested",
      target: email,
      metadata: { company: company || null },
    });

    const admins = await getAdminEmails(org.id);
    const adminUrl = `${APP_URL}/trust`;
    await Promise.all(
      admins.map((to) =>
        sendEmail({
          to,
          subject: `Trust center report request, ${org.name}`,
          html: `
            <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2dd4bf;">Trust center</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">Report request received</h1>
            <p style="margin:0 0 16px;color:#a8a29e;">Someone requested a compliance report via your public trust center.</p>
            <ul style="margin:0 0 8px;padding-left:18px;color:#a8a29e;">
              <li style="margin:0 0 8px;">Email: <strong style="color:#f5f5f4;">${escapeHtml(email)}</strong></li>
              ${company ? `<li style="margin:0 0 8px;">Company: <strong style="color:#f5f5f4;">${escapeHtml(company)}</strong></li>` : ""}
              ${note ? `<li style="margin:0 0 8px;">Note: ${escapeHtml(note)}</li>` : ""}
            </ul>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
              <tr>
                <td style="border-radius:6px;background-color:#0f766e;">
                  <a href="${adminUrl}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ccfbf1;text-decoration:none;">Open trust center</a>
                </td>
              </tr>
            </table>
          `,
        }).catch((e) => {
          console.warn("[trust] admin notify failed", { to, e });
          return { sent: false as const };
        })
      )
    );

    return reply.send(
      ok({
        received: true,
        message: `Thanks, we notified ${org.name}. They’ll follow up at ${email}.`,
      })
    );
  });
};
