import type { FastifyPluginAsync } from "fastify";
import type { ItemReviewStatus, QuestionnaireStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";
import { computeVendorScore } from "../services/vendors/vendor-score.js";
import { catalogCreateRows } from "../services/questionnaires/catalog.js";

function mapItemStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    EDIT: "Needs edit",
    SKIP: "Skip",
  };
  return map[s] ?? s;
}

function serializeItem(i: {
  id: string;
  question: string;
  category: string;
  suggestedAnswer: string | null;
  finalAnswer: string | null;
  status: string;
  sortOrder: number;
}) {
  return {
    id: i.id,
    q: i.question,
    category: i.category || "General",
    suggestedAnswer: i.suggestedAnswer ?? "",
    answer: i.finalAnswer ?? i.suggestedAnswer ?? "",
    status: mapItemStatus(i.status),
    sortOrder: i.sortOrder,
  };
}

function serializeQuestionnaire(q: {
  id: string;
  title: string;
  status: QuestionnaireStatus;
  vendorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    question: string;
    category: string;
    suggestedAnswer: string | null;
    finalAnswer: string | null;
    status: string;
    sortOrder: number;
  }>;
}) {
  const approved = q.items.filter((i) => i.status === "APPROVED" || i.status === "SKIP").length;
  return {
    id: q.id,
    title: q.title,
    status: q.status,
    vendorId: q.vendorId,
    itemCount: q.items.length,
    approvedCount: approved,
    progressPercent: q.items.length
      ? Math.round((approved / q.items.length) * 100)
      : 0,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    items: q.items.map(serializeItem),
  };
}

async function syncVendorFromQuestionnaire(questionnaireId: string) {
  const q = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId },
    include: { items: true, vendor: true },
  });
  if (!q?.vendorId || !q.vendor) return;

  const total = q.items.length;
  const approved = q.items.filter((i) => i.status === "APPROVED" || i.status === "SKIP").length;
  const allDone = total > 0 && approved === total;

  const questionnaireStatus = allDone
    ? "Complete"
    : approved > 0
      ? `In progress (${approved}/${total})`
      : "In progress";

  const reviewStatus =
    allDone && q.vendor.reviewStatus === "PENDING" ? "IN_REVIEW" : q.vendor.reviewStatus;

  const score = computeVendorScore({
    riskLevel: q.vendor.riskLevel,
    soc2Certified: q.vendor.soc2Certified,
    dataProcessing: q.vendor.dataProcessing,
    reviewStatus,
    questionnaireStatus,
  });

  await prisma.vendor.update({
    where: { id: q.vendorId },
    data: {
      questionnaireStatus,
      reviewStatus,
      score,
      ...(allDone ? { lastReviewed: new Date() } : {}),
    },
  });

  await prisma.questionnaire.update({
    where: { id: q.id },
    data: {
      status: allDone ? "COMPLETE" : approved > 0 ? "IN_REVIEW" : q.status === "DRAFT" ? "IN_REVIEW" : q.status,
    },
  });
}

async function seedItemsIfEmpty(questionnaireId: string) {
  const count = await prisma.questionnaireItem.count({ where: { questionnaireId } });
  if (count > 0) return;
  await prisma.questionnaireItem.createMany({
    data: catalogCreateRows().map((row) => ({
      questionnaireId,
      ...row,
    })),
  });
}

const UI_TO_DB: Record<string, ItemReviewStatus> = {
  Pending: "PENDING",
  Approved: "APPROVED",
  "Needs edit": "EDIT",
  Edit: "EDIT",
  Skip: "SKIP",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  EDIT: "EDIT",
  SKIP: "SKIP",
};

export const questionnairesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/questionnaires", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const query = req.query as { vendorId?: string };
    const list = await prisma.questionnaire.findMany({
      where: {
        orgId: org.id,
        ...(query.vendorId ? { vendorId: query.vendorId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.send(ok(list.map(serializeQuestionnaire)));
  });

  app.get("/questionnaires/:id", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const q = await prisma.questionnaire.findFirst({
      where: { id, orgId: org.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!q) return reply.status(404).send(err("Questionnaire not found"));
    return reply.send(ok(serializeQuestionnaire(q)));
  });

  app.post("/questionnaires", async (req, reply) => {
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

    const body = (req.body as { title?: string; vendorId?: string; forceNew?: boolean }) ?? {};
    const vendorId = body.vendorId?.trim() || null;
    const forceNew = Boolean(body.forceNew);

    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, orgId: org.id },
      });
      if (!vendor) return reply.status(404).send(err("Vendor not found"));

      if (!forceNew) {
        const existing = await prisma.questionnaire.findFirst({
          where: { orgId: org.id, vendorId },
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "desc" },
        });
        if (existing) {
          if (existing.items.length === 0) {
            await seedItemsIfEmpty(existing.id);
            const refreshed = await prisma.questionnaire.findUniqueOrThrow({
              where: { id: existing.id },
              include: { items: { orderBy: { sortOrder: "asc" } } },
            });
            return reply.send(ok(serializeQuestionnaire(refreshed)));
          }
          return reply.send(ok(serializeQuestionnaire(existing)));
        }
      }

      const title = body.title?.trim() || `${vendor.name} security questionnaire`;
      const questionnaire = await prisma.questionnaire.create({
        data: {
          orgId: org.id,
          vendorId,
          title,
          status: "IN_REVIEW",
          items: { create: catalogCreateRows() },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          questionnaireStatus: "In progress",
          reviewStatus: vendor.reviewStatus === "APPROVED" ? "APPROVED" : "IN_REVIEW",
          lastReviewed: new Date(),
          score: computeVendorScore({
            ...vendor,
            reviewStatus: vendor.reviewStatus === "APPROVED" ? "APPROVED" : "IN_REVIEW",
            questionnaireStatus: "In progress",
          }),
        },
      });

      return reply.status(201).send(ok(serializeQuestionnaire(questionnaire)));
    }

    // Org-level outbound / internal questionnaire
    if (!forceNew) {
      const existing = await prisma.questionnaire.findFirst({
        where: { orgId: org.id, vendorId: null, status: { not: "COMPLETE" } },
        include: { items: { orderBy: { sortOrder: "asc" } } },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        if (existing.items.length === 0) {
          await seedItemsIfEmpty(existing.id);
          const refreshed = await prisma.questionnaire.findUniqueOrThrow({
            where: { id: existing.id },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          });
          return reply.send(ok(serializeQuestionnaire(refreshed)));
        }
        return reply.send(ok(serializeQuestionnaire(existing)));
      }
    }

    const title = body.title?.trim() || "Security questionnaire";
    const questionnaire = await prisma.questionnaire.create({
      data: {
        orgId: org.id,
        title,
        status: "IN_REVIEW",
        items: { create: catalogCreateRows() },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.status(201).send(ok(serializeQuestionnaire(questionnaire)));
  });

  app.patch("/questionnaires/:questionnaireId/items/:itemId", async (req, reply) => {
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

    const { questionnaireId, itemId } = req.params as {
      questionnaireId: string;
      itemId: string;
    };
    const body = req.body as { answer?: string; status?: string };

    const item = await prisma.questionnaireItem.findFirst({
      where: {
        id: itemId,
        questionnaire: { id: questionnaireId, orgId: org.id },
      },
    });
    if (!item) return reply.status(404).send(err("Item not found"));

    const updated = await prisma.questionnaireItem.update({
      where: { id: itemId },
      data: {
        ...(body.answer !== undefined ? { finalAnswer: body.answer } : {}),
        ...(body.status
          ? { status: UI_TO_DB[body.status] ?? "EDIT" }
          : {}),
      },
    });

    await syncVendorFromQuestionnaire(questionnaireId);

    return reply.send(ok(serializeItem(updated)));
  });

  app.post("/questionnaires/:id/approve-all", async (req, reply) => {
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
    const q = await prisma.questionnaire.findFirst({
      where: { id, orgId: org.id },
      include: { items: true },
    });
    if (!q) return reply.status(404).send(err("Questionnaire not found"));

    await prisma.$transaction(
      q.items.map((item) =>
        prisma.questionnaireItem.update({
          where: { id: item.id },
          data: {
            status: "APPROVED",
            finalAnswer: item.finalAnswer ?? item.suggestedAnswer ?? "",
          },
        })
      )
    );

    await syncVendorFromQuestionnaire(id);

    const refreshed = await prisma.questionnaire.findUniqueOrThrow({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.send(ok(serializeQuestionnaire(refreshed)));
  });

  app.post("/questionnaires/:id/complete", async (req, reply) => {
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
    const q = await prisma.questionnaire.findFirst({
      where: { id, orgId: org.id },
      include: { items: true },
    });
    if (!q) return reply.status(404).send(err("Questionnaire not found"));

    const pending = q.items.filter((i) => i.status !== "APPROVED" && i.status !== "SKIP");
    if (pending.length > 0) {
      return reply
        .status(400)
        .send(err(`Approve or skip all questions first (${pending.length} remaining).`));
    }

    await prisma.questionnaire.update({
      where: { id },
      data: { status: "COMPLETE" },
    });
    await syncVendorFromQuestionnaire(id);

    const refreshed = await prisma.questionnaire.findUniqueOrThrow({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.send(ok(serializeQuestionnaire(refreshed)));
  });
};
