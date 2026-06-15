import type { FastifyPluginAsync } from "fastify";
import type { RiskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";

function clampScoreDimension(n: number): number {
  return Math.min(3, Math.max(1, Math.round(n)));
}

function computeScore(likelihood: number, impact: number): number {
  return clampScoreDimension(likelihood) * clampScoreDimension(impact);
}

function mapRisk(r: {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  score: number;
  status: RiskStatus;
  mitigation: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    likelihood: r.likelihood,
    impact: r.impact,
    score: r.score,
    status: r.status,
    mitigation: r.mitigation,
    ownerId: r.ownerId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

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
      orderBy: { score: "desc" },
    });

    return reply.send(ok(risks.map(mapRisk)));
  });

  app.get("/risks/export", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const risks = await prisma.risk.findMany({
      where: { orgId: org.id },
      orderBy: { score: "desc" },
    });

    const header = "Title,Description,Likelihood,Impact,Score,Status,Mitigation,Updated";
    const rows = risks.map((r) =>
      [
        escapeCsv(r.title),
        escapeCsv(r.description),
        r.likelihood,
        r.impact,
        r.score,
        r.status,
        escapeCsv(r.mitigation ?? ""),
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
      likelihood?: number;
      impact?: number;
      mitigation?: string;
    };

    if (!body.title?.trim()) {
      return reply.status(400).send(err("title is required"));
    }

    const likelihood = clampScoreDimension(body.likelihood ?? 2);
    const impact = clampScoreDimension(body.impact ?? 2);

    const risk = await prisma.risk.create({
      data: {
        orgId: org.id,
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        likelihood,
        impact,
        score: computeScore(likelihood, impact),
        mitigation: body.mitigation?.trim() || null,
        status: "OPEN",
      },
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
      likelihood?: number;
      impact?: number;
      mitigation?: string;
      status?: RiskStatus;
    };

    const likelihood =
      body.likelihood != null ? clampScoreDimension(body.likelihood) : existing.likelihood;
    const impact = body.impact != null ? clampScoreDimension(body.impact) : existing.impact;

    const risk = await prisma.risk.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.mitigation !== undefined ? { mitigation: body.mitigation || null } : {}),
        ...(body.status ? { status: body.status } : {}),
        likelihood,
        impact,
        score: computeScore(likelihood, impact),
      },
    });

    return reply.send(ok(mapRisk(risk)));
  });
};
