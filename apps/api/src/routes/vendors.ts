import type { FastifyPluginAsync } from "fastify";
import type { ReviewStatus, RiskLevel } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization, requireOrganization } from "../lib/org-context.js";
import { requireExportRole, requireMutation, requireRead } from "../lib/authorization.js";
import { computeVendorScore } from "../services/vendors/vendor-score.js";
import { catalogCreateRows } from "../services/questionnaires/catalog.js";

const REVIEW_STATUS_LABEL: Record<string, string> = {
  PENDING: "Not reviewed",
  IN_REVIEW: "Review needed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const RISK_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function mapVendor(v: {
  id: string;
  name: string;
  website: string | null;
  category: string;
  riskLevel: string;
  reviewStatus: string;
  lastReviewed: Date | null;
  notes: string | null;
  owner: string | null;
  dataAccess: string | null;
  contractRenewal: Date | null;
  score: number | null;
  questionnaireStatus: string | null;
  documents: unknown;
  subprocessors: unknown;
  dataProcessing: boolean;
  soc2Certified: boolean;
}) {
  const score =
    v.score ??
    computeVendorScore({
      riskLevel: v.riskLevel,
      soc2Certified: v.soc2Certified,
      dataProcessing: v.dataProcessing,
      reviewStatus: v.reviewStatus,
      questionnaireStatus: v.questionnaireStatus,
    });

  return {
    id: v.id,
    name: v.name,
    website: v.website,
    category: v.category,
    riskLevel: v.riskLevel,
    risk: RISK_LABEL[v.riskLevel] ?? v.riskLevel,
    reviewStatus: v.reviewStatus,
    status: REVIEW_STATUS_LABEL[v.reviewStatus] ?? v.reviewStatus,
    lastReviewed: v.lastReviewed?.toISOString() ?? null,
    lastReview: v.lastReviewed?.toISOString() ?? null,
    notes: v.notes,
    owner: v.owner,
    dataAccess: v.dataAccess,
    contractRenewal: v.contractRenewal?.toISOString() ?? null,
    score,
    questionnaire: v.questionnaireStatus,
    questionnaireStatus: v.questionnaireStatus,
    documents: Array.isArray(v.documents) ? (v.documents as string[]) : [],
    subprocessors: Array.isArray(v.subprocessors) ? (v.subprocessors as string[]) : [],
    dataProcessing: v.dataProcessing,
    soc2: v.soc2Certified,
    soc2Certified: v.soc2Certified,
  };
}

async function recomputeAndSaveScore(vendorId: string) {
  const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!v) return null;
  const score = computeVendorScore(v);
  return prisma.vendor.update({ where: { id: vendorId }, data: { score } });
}

export const vendorsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/vendors", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const vendors = await prisma.vendor.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
    });

    return reply.send(ok(vendors.map(mapVendor)));
  });

  app.get("/vendors/export", async (req, reply) => {
    try {
      await requireExportRole(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const vendors = await prisma.vendor.findMany({
      where: { orgId: org.id },
      orderBy: { name: "asc" },
    });

    const header =
      "Name,Category,Website,Owner,Risk,Status,SOC2,Data processing,Data access,Score,Questionnaire,Contract renewal,Last reviewed,Notes";
    const rows = vendors.map((v) => {
      const m = mapVendor(v);
      return [
        escapeCsv(m.name),
        escapeCsv(m.category),
        escapeCsv(m.website ?? ""),
        escapeCsv(m.owner ?? ""),
        escapeCsv(m.risk),
        escapeCsv(m.status),
        m.soc2Certified ? "yes" : "no",
        m.dataProcessing ? "yes" : "no",
        escapeCsv(m.dataAccess ?? ""),
        String(m.score ?? ""),
        escapeCsv(m.questionnaireStatus ?? ""),
        m.contractRenewal?.slice(0, 10) ?? "",
        m.lastReviewed?.slice(0, 10) ?? "",
        escapeCsv(m.notes ?? ""),
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = `vendors-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(csv);
  });

  app.get("/vendors/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
    if (!vendor) return reply.status(404).send(err("Vendor not found"));

    const questionnaire = await prisma.questionnaire.findFirst({
      where: { orgId: org.id, vendorId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, title: true },
    });

    return reply.send(
      ok({
        ...mapVendor(vendor),
        questionnaireId: questionnaire?.id ?? null,
      })
    );
  });

  app.post("/vendors", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = req.body as {
      name?: string;
      category?: string;
      website?: string;
      owner?: string;
      dataAccess?: string;
      riskLevel?: RiskLevel;
      dataProcessing?: boolean;
      soc2Certified?: boolean;
      contractRenewal?: string | null;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const riskLevel = body.riskLevel ?? "MEDIUM";
    const soc2Certified = Boolean(body.soc2Certified);
    const dataProcessing = Boolean(body.dataProcessing);
    const score = computeVendorScore({
      riskLevel,
      soc2Certified,
      dataProcessing,
      reviewStatus: "PENDING",
      questionnaireStatus: null,
    });

    const vendor = await prisma.vendor.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        category: body.category?.trim() || "SaaS",
        website: body.website?.trim() || null,
        owner: body.owner?.trim() || null,
        dataAccess: body.dataAccess?.trim() || null,
        riskLevel,
        dataProcessing,
        soc2Certified,
        notes: body.notes?.trim() || null,
        contractRenewal: body.contractRenewal ? new Date(body.contractRenewal) : null,
        reviewStatus: "PENDING",
        score,
      },
    });

    return reply.send(ok(mapVendor(vendor)));
  });

  app.patch("/vendors/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Vendor not found"));

    const body = req.body as {
      name?: string;
      category?: string;
      website?: string | null;
      reviewStatus?: ReviewStatus;
      notes?: string | null;
      riskLevel?: RiskLevel;
      owner?: string | null;
      dataAccess?: string | null;
      questionnaireStatus?: string | null;
      contractRenewal?: string | null;
      dataProcessing?: boolean;
      soc2Certified?: boolean;
      documents?: string[];
      subprocessors?: string[];
    };

    const nextRisk = body.riskLevel ?? existing.riskLevel;
    const nextSoc2 = body.soc2Certified ?? existing.soc2Certified;
    const nextProcessing = body.dataProcessing ?? existing.dataProcessing;
    const nextReview = body.reviewStatus ?? existing.reviewStatus;
    const nextQ =
      body.questionnaireStatus !== undefined
        ? body.questionnaireStatus
        : existing.questionnaireStatus;

    const score = computeVendorScore({
      riskLevel: nextRisk,
      soc2Certified: nextSoc2,
      dataProcessing: nextProcessing,
      reviewStatus: nextReview,
      questionnaireStatus: nextQ,
    });

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.category?.trim() ? { category: body.category.trim() } : {}),
        ...(body.website !== undefined ? { website: body.website?.trim() || null } : {}),
        ...(body.reviewStatus ? { reviewStatus: body.reviewStatus } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        ...(body.riskLevel ? { riskLevel: body.riskLevel } : {}),
        ...(body.owner !== undefined ? { owner: body.owner || null } : {}),
        ...(body.dataAccess !== undefined ? { dataAccess: body.dataAccess || null } : {}),
        ...(body.questionnaireStatus !== undefined
          ? { questionnaireStatus: body.questionnaireStatus || null }
          : {}),
        ...(body.contractRenewal !== undefined
          ? { contractRenewal: body.contractRenewal ? new Date(body.contractRenewal) : null }
          : {}),
        ...(body.dataProcessing !== undefined ? { dataProcessing: body.dataProcessing } : {}),
        ...(body.soc2Certified !== undefined ? { soc2Certified: body.soc2Certified } : {}),
        ...(body.documents !== undefined ? { documents: body.documents } : {}),
        ...(body.subprocessors !== undefined ? { subprocessors: body.subprocessors } : {}),
        ...(body.reviewStatus === "APPROVED" || body.reviewStatus === "IN_REVIEW"
          ? { lastReviewed: new Date() }
          : {}),
        score,
      },
    });

    return reply.send(ok(mapVendor(vendor)));
  });

  app.delete("/vendors/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Vendor not found"));

    await prisma.questionnaire.updateMany({
      where: { orgId: org.id, vendorId: id },
      data: { vendorId: null },
    });
    await prisma.vendor.delete({ where: { id } });

    return reply.send(ok({ deleted: true, id }));
  });

  /** Create or resume a security questionnaire bound to this vendor. */
  app.post("/vendors/:id/questionnaire", async (req, reply) => {
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

    const { id } = req.params as { id: string };
    const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
    if (!vendor) return reply.status(404).send(err("Vendor not found"));

    let questionnaire = await prisma.questionnaire.findFirst({
      where: { orgId: org.id, vendorId: id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    if (!questionnaire) {
      questionnaire = await prisma.questionnaire.create({
        data: {
          orgId: org.id,
          vendorId: id,
          title: `${vendor.name} security questionnaire`,
          status: "IN_REVIEW",
          items: { create: catalogCreateRows() },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    } else if (questionnaire.items.length === 0) {
      await prisma.questionnaireItem.createMany({
        data: catalogCreateRows().map((row) => ({
          questionnaireId: questionnaire!.id,
          ...row,
        })),
      });
      questionnaire = await prisma.questionnaire.findUniqueOrThrow({
        where: { id: questionnaire.id },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    }

    await prisma.vendor.update({
      where: { id },
      data: {
        questionnaireStatus:
          questionnaire.items.filter((i) => i.status === "APPROVED" || i.status === "SKIP")
            .length === questionnaire.items.length && questionnaire.items.length > 0
            ? "Complete"
            : "In progress",
        reviewStatus:
          vendor.reviewStatus === "APPROVED" ? vendor.reviewStatus : "IN_REVIEW",
        lastReviewed: new Date(),
      },
    });
    await recomputeAndSaveScore(id);

    const mapStatus = (s: string) =>
      s === "APPROVED" ? "Approved" : s === "SKIP" ? "Skip" : s === "EDIT" ? "Needs edit" : "Pending";

    return reply.send(
      ok({
        id: questionnaire.id,
        vendorId: id,
        title: questionnaire.title,
        status: questionnaire.status,
        itemCount: questionnaire.items.length,
        approvedCount: questionnaire.items.filter(
          (i) => i.status === "APPROVED" || i.status === "SKIP"
        ).length,
        progressPercent: questionnaire.items.length
          ? Math.round(
              (questionnaire.items.filter((i) => i.status === "APPROVED" || i.status === "SKIP")
                .length /
                questionnaire.items.length) *
                100
            )
          : 0,
        items: questionnaire.items.map((i) => ({
          id: i.id,
          q: i.question,
          category: i.category || "General",
          suggestedAnswer: i.suggestedAnswer ?? "",
          answer: i.finalAnswer ?? i.suggestedAnswer ?? "",
          status: mapStatus(i.status),
        })),
      })
    );
  });
};
