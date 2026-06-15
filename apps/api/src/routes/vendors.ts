import type { FastifyPluginAsync } from "fastify";
import type { ReviewStatus, RiskLevel } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";

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
    score: v.score,
    questionnaire: v.questionnaireStatus,
    questionnaireStatus: v.questionnaireStatus,
    documents: Array.isArray(v.documents) ? (v.documents as string[]) : [],
    subprocessors: Array.isArray(v.subprocessors) ? (v.subprocessors as string[]) : [],
    dataProcessing: v.dataProcessing,
    soc2: v.soc2Certified,
    soc2Certified: v.soc2Certified,
  };
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

  app.get("/vendors/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send({ data: null, error: "Organization not found" });
    const { id } = req.params as { id: string };

    const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
    if (!vendor) return reply.status(404).send({ data: null, error: "Vendor not found" });

    return reply.send(ok(mapVendor(vendor)));
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
    };

    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const vendor = await prisma.vendor.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        category: body.category?.trim() || "SaaS",
        website: body.website?.trim() || null,
        owner: body.owner?.trim() || null,
        dataAccess: body.dataAccess?.trim() || null,
        riskLevel: body.riskLevel ?? "MEDIUM",
        dataProcessing: body.dataProcessing ?? false,
        reviewStatus: "PENDING",
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
      reviewStatus?: ReviewStatus;
      notes?: string;
      riskLevel?: RiskLevel;
      owner?: string;
      dataAccess?: string;
      questionnaireStatus?: string;
    };

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(body.reviewStatus ? { reviewStatus: body.reviewStatus } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        ...(body.riskLevel ? { riskLevel: body.riskLevel } : {}),
        ...(body.owner !== undefined ? { owner: body.owner || null } : {}),
        ...(body.dataAccess !== undefined ? { dataAccess: body.dataAccess || null } : {}),
        ...(body.questionnaireStatus !== undefined
          ? { questionnaireStatus: body.questionnaireStatus || null }
          : {}),
        ...(body.reviewStatus === "APPROVED" || body.reviewStatus === "IN_REVIEW"
          ? { lastReviewed: new Date() }
          : {}),
      },
    });

    return reply.send(ok(mapVendor(vendor)));
  });
};
