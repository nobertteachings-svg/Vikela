import type { FastifyPluginAsync } from "fastify";
import type { RiskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireExportRole, requireMutation, requireRead } from "../lib/authorization.js";

const RISK_CATEGORIES = [
  "Security",
  "Operational",
  "Compliance",
  "Third-party",
  "Financial",
  "Technology",
] as const;

const RISK_STATUSES: RiskStatus[] = ["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"];

function clampScoreDimension(n: number): number {
  return Math.min(3, Math.max(1, Math.round(n)));
}

function computeScore(likelihood: number, impact: number): number {
  return clampScoreDimension(likelihood) * clampScoreDimension(impact);
}

function defaultNextReviewAt(from = new Date()): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + 90);
  return d;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function normalizeCategory(raw: unknown, fallback = "Operational"): string {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  const trimmed = raw.trim();
  const match = RISK_CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed.slice(0, 64);
}

async function resolveOwnerId(
  orgId: string,
  ownerId: unknown
): Promise<{ ok: true; ownerId: string | null } | { ok: false; message: string }> {
  if (ownerId === undefined) return { ok: true, ownerId: null };
  if (ownerId === null || ownerId === "") return { ok: true, ownerId: null };
  if (typeof ownerId !== "string") return { ok: false, message: "ownerId must be a string" };

  const member = await prisma.member.findFirst({
    where: { id: ownerId, orgId },
    select: { id: true },
  });
  if (!member) return { ok: false, message: "ownerId must be a member of this organization" };
  return { ok: true, ownerId: member.id };
}

type RiskWithOwner = {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  status: RiskStatus;
  mitigation: string | null;
  ownerId: string | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner: { id: string; name: string; email: string } | null;
};

function mapRisk(r: RiskWithOwner) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    likelihood: r.likelihood,
    impact: r.impact,
    score: r.score,
    status: r.status,
    mitigation: r.mitigation,
    ownerId: r.ownerId,
    ownerName: r.owner?.name ?? null,
    ownerEmail: r.owner?.email ?? null,
    nextReviewAt: r.nextReviewAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

const riskInclude = {
  owner: { select: { id: true, name: true, email: true } },
} as const;

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const risksRoutes: FastifyPluginAsync = async (app) => {
  app.get("/risks", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const risks = await prisma.risk.findMany({
      where: { orgId: org.id },
      include: riskInclude,
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    });

    return reply.send(ok(risks.map(mapRisk)));
  });

  app.get("/risks/export", async (req, reply) => {
    try {
      await requireExportRole(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const risks = await prisma.risk.findMany({
      where: { orgId: org.id },
      include: riskInclude,
      orderBy: { score: "desc" },
    });

    const header =
      "Title,Category,Description,Likelihood,Impact,Score,Status,Owner,Mitigation,Next review,Updated";
    const rows = risks.map((r) =>
      [
        escapeCsv(r.title),
        escapeCsv(r.category),
        escapeCsv(r.description),
        r.likelihood,
        r.impact,
        r.score,
        r.status,
        escapeCsv(r.owner?.name ?? r.owner?.email ?? ""),
        escapeCsv(r.mitigation ?? ""),
        r.nextReviewAt?.toISOString().slice(0, 10) ?? "",
        r.updatedAt.toISOString(),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const filename = `risk-register-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(csv);
  });

  app.post("/risks", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = req.body as {
      title?: string;
      description?: string;
      category?: string;
      likelihood?: number;
      impact?: number;
      mitigation?: string;
      ownerId?: string | null;
      nextReviewAt?: string | null;
    };

    if (!body.title?.trim()) {
      return reply.status(400).send(err("title is required"));
    }

    const owner = await resolveOwnerId(org.id, body.ownerId);
    if (!owner.ok) return reply.status(400).send(err(owner.message));

    const nextReviewParsed = parseOptionalDate(body.nextReviewAt);
    if (body.nextReviewAt !== undefined && nextReviewParsed === undefined) {
      return reply.status(400).send(err("nextReviewAt must be a valid date"));
    }

    const likelihood = clampScoreDimension(body.likelihood ?? 2);
    const impact = clampScoreDimension(body.impact ?? 2);

    const risk = await prisma.risk.create({
      data: {
        orgId: org.id,
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        category: normalizeCategory(body.category),
        likelihood,
        impact,
        score: computeScore(likelihood, impact),
        mitigation: body.mitigation?.trim() || null,
        ownerId: owner.ownerId,
        nextReviewAt: nextReviewParsed ?? defaultNextReviewAt(),
        status: "OPEN",
      },
      include: riskInclude,
    });

    return reply.send(ok(mapRisk(risk)));
  });

  app.patch("/risks/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.risk.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Risk not found"));

    const body = req.body as {
      title?: string;
      description?: string;
      category?: string;
      likelihood?: number;
      impact?: number;
      mitigation?: string;
      status?: RiskStatus;
      ownerId?: string | null;
      nextReviewAt?: string | null;
    };

    if (body.status != null && !RISK_STATUSES.includes(body.status)) {
      return reply.status(400).send(err("Invalid status"));
    }

    let ownerIdUpdate: string | null | undefined;
    if (body.ownerId !== undefined) {
      const owner = await resolveOwnerId(org.id, body.ownerId);
      if (!owner.ok) return reply.status(400).send(err(owner.message));
      ownerIdUpdate = owner.ownerId;
    }

    const nextReviewParsed = parseOptionalDate(body.nextReviewAt);
    if (body.nextReviewAt !== undefined && nextReviewParsed === undefined) {
      return reply.status(400).send(err("nextReviewAt must be a valid date"));
    }

    const likelihood =
      body.likelihood != null ? clampScoreDimension(body.likelihood) : existing.likelihood;
    const impact = body.impact != null ? clampScoreDimension(body.impact) : existing.impact;

    const risk = await prisma.risk.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.category !== undefined ? { category: normalizeCategory(body.category, existing.category) } : {}),
        ...(body.mitigation !== undefined ? { mitigation: body.mitigation || null } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(ownerIdUpdate !== undefined ? { ownerId: ownerIdUpdate } : {}),
        ...(nextReviewParsed !== undefined ? { nextReviewAt: nextReviewParsed } : {}),
        likelihood,
        impact,
        score: computeScore(likelihood, impact),
      },
      include: riskInclude,
    });

    return reply.send(ok(mapRisk(risk)));
  });

  app.delete("/risks/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.risk.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Risk not found"));

    await prisma.risk.delete({ where: { id } });
    return reply.send(ok({ id, deleted: true }));
  });
};
