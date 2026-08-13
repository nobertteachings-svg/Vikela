import type { FastifyPluginAsync } from "fastify";
import { ok, err } from "../lib/response.js";
import {
  chatWithCopilot,
  explainGap,
  streamCopilotChat,
} from "../services/copilot/chat.js";
import { getCopilotSuggestions } from "../services/copilot/context.js";
import { createThread, getThread, listThreads } from "../services/copilot/threads.js";
import { ingestOrgKnowledge } from "../services/rag/ingest.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireAdmin, requireMutation, requireRead } from "../lib/authorization.js";
import { assertPlanFeature } from "../lib/plan-features.js";

function featureDenied(e: unknown) {
  const status = (e as { statusCode?: number }).statusCode ?? 402;
  return { status, message: e instanceof Error ? e.message : "Plan upgrade required" };
}

export const copilotRoutes: FastifyPluginAsync = async (app) => {
  app.get("/copilot/suggestions", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }
    const suggestions = await getCopilotSuggestions(org.id);
    return reply.send(ok({ suggestions }));
  });

  app.get("/copilot/threads", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const threads = await listThreads(org.id);
    return reply.send(
      ok(
        threads.map((t) => ({
          id: t.id,
          title: t.title,
          updatedAt: t.updatedAt.toISOString(),
          messageCount: t._count.messages,
          preview: t.messages[0]?.content.slice(0, 120),
        }))
      )
    );
  });

  app.post("/copilot/threads", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }
    const body = (req.body as { title?: string }) ?? {};
    const thread = await createThread(org.id, body.title);
    return reply.send(ok({ id: thread.id, title: thread.title }));
  });

  app.get("/copilot/threads/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };
    const thread = await getThread(id, org.id);
    if (!thread) return reply.status(404).send(err("Thread not found"));
    return reply.send(
      ok({
        id: thread.id,
        title: thread.title,
        messages: thread.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          createdAt: m.createdAt.toISOString(),
        })),
      })
    );
  });

  app.post("/copilot/chat", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }

    const body = req.body as {
      message: string;
      threadId?: string;
      gapId?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!body.message?.trim()) {
      return reply.status(400).send(err("message is required"));
    }

    try {
      const result = await chatWithCopilot({
        orgId: org.id,
        message: body.message.trim(),
        threadId: body.threadId,
        gapId: body.gapId,
        history: body.history,
      });
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Copilot failed"));
    }
  });

  app.post("/copilot/chat/stream", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }

    const body = req.body as {
      message: string;
      threadId?: string;
      gapId?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!body.message?.trim()) {
      return reply.status(400).send(err("message is required"));
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      for await (const event of streamCopilotChat({
        orgId: org.id,
        message: body.message.trim(),
        threadId: body.threadId,
        gapId: body.gapId,
        history: body.history,
      })) {
        if (event.type === "delta") {
          reply.raw.write(`data: ${JSON.stringify({ delta: event.text })}\n\n`);
        } else {
          reply.raw.write(`data: ${JSON.stringify({ done: true, result: event.result })}\n\n`);
        }
      }
    } catch (e) {
      reply.raw.write(
        `data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Stream failed" })}\n\n`
      );
    }

    reply.raw.end();
  });

  app.post("/copilot/explain-gap/:gapId", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }
    const { gapId } = req.params as { gapId: string };

    try {
      const result = await explainGap(org.id, gapId);
      return reply.send(ok(result));
    } catch (e) {
      return reply.status(500).send(err(e instanceof Error ? e.message : "Explain failed"));
    }
  });

  app.post("/copilot/reindex", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    try {
      assertPlanFeature(org, "copilot");
    } catch (e) {
      const { status, message } = featureDenied(e);
      return reply.status(status).send(err(message));
    }
    const count = await ingestOrgKnowledge(org.id);
    return reply.send(ok({ chunks: count }));
  });
};
