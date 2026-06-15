import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";

function mapItemStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING: "Edit",
    APPROVED: "Approved",
    EDIT: "Edit",
    SKIP: "Skip",
  };
  return map[s] ?? s;
}

export const questionnairesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/questionnaires", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const list = await prisma.questionnaire.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.send(
      ok(
        list.map((q) => ({
          id: q.id,
          title: q.title,
          status: q.status,
          itemCount: q.items.length,
          items: q.items.map((i) => ({
            id: i.id,
            q: i.question,
            answer: i.finalAnswer ?? i.suggestedAnswer ?? "",
            status: mapItemStatus(i.status),
          })),
        }))
      )
    );
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

    const body = (req.body as { title?: string }) ?? {};
    const title = body.title?.trim() || "Vendor security questionnaire";

    const existing = await prisma.questionnaire.findFirst({
      where: { orgId: org.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.items.length > 0) {
      return reply.send(
        ok({
          id: existing.id,
          title: existing.title,
          items: existing.items.map((i) => ({
            id: i.id,
            q: i.question,
            answer: i.finalAnswer ?? i.suggestedAnswer ?? "",
            status: mapItemStatus(i.status),
          })),
        })
      );
    }

    const defaults = [
      {
        question: "Do you encrypt data at rest?",
        suggestedAnswer:
          "Yes. All production data stores use AES-256 encryption. Object storage has default encryption enabled.",
        status: "APPROVED" as const,
      },
      {
        question: "How do you manage access to production?",
        suggestedAnswer:
          "Access via SSO with MFA. Least-privilege IAM roles. Quarterly access reviews.",
        status: "APPROVED" as const,
      },
      {
        question: "Describe your incident response process.",
        suggestedAnswer:
          "Documented IR plan with defined triage SLA. Post-mortems within 5 business days.",
        status: "EDIT" as const,
      },
      {
        question: "Do you perform penetration testing?",
        suggestedAnswer: "Annual third-party penetration test.",
        status: "APPROVED" as const,
      },
      {
        question: "How is customer data segregated?",
        suggestedAnswer: "Multi-tenant architecture with organization-level isolation at the database layer.",
        status: "SKIP" as const,
      },
    ];

    const questionnaire = await prisma.questionnaire.create({
      data: {
        orgId: org.id,
        title,
        status: "IN_REVIEW",
        items: {
          create: defaults.map((d, idx) => ({
            question: d.question,
            suggestedAnswer: d.suggestedAnswer,
            status: d.status,
            sortOrder: idx,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return reply.send(
      ok({
        id: questionnaire.id,
        title: questionnaire.title,
        items: questionnaire.items.map((i) => ({
          id: i.id,
          q: i.question,
          answer: i.finalAnswer ?? i.suggestedAnswer ?? "",
          status: mapItemStatus(i.status),
        })),
      })
    );
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

    const statusMap: Record<string, "PENDING" | "APPROVED" | "EDIT" | "SKIP"> = {
      Approved: "APPROVED",
      Edit: "EDIT",
      Skip: "SKIP",
      PENDING: "PENDING",
      APPROVED: "APPROVED",
      EDIT: "EDIT",
      SKIP: "SKIP",
    };

    const updated = await prisma.questionnaireItem.update({
      where: { id: itemId },
      data: {
        ...(body.answer !== undefined ? { finalAnswer: body.answer } : {}),
        ...(body.status ? { status: statusMap[body.status] ?? "EDIT" } : {}),
      },
    });

    return reply.send(
      ok({
        id: updated.id,
        q: updated.question,
        answer: updated.finalAnswer ?? updated.suggestedAnswer ?? "",
        status: mapItemStatus(updated.status),
      })
    );
  });
};
