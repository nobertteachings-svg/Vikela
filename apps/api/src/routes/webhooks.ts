import type { FastifyPluginAsync } from "fastify";
import { handleGitHubWebhook } from "../services/git/github/github.webhook.js";
import { handleGitLabWebhook } from "../services/git/gitlab/gitlab.webhook.js";
import { handleBitbucketWebhook } from "../services/git/bitbucket/bitbucket.webhook.js";
import { ok, err } from "../lib/response.js";

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/github", {
    config: { rawBody: true },
    handler: async (req, reply) => {
      const event = (req.headers["x-github-event"] as string) ?? "";
      const signature = (req.headers["x-hub-signature-256"] as string) ?? "";
      const rawBody = (req as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

      const result = await handleGitHubWebhook(
        event,
        req.body as Parameters<typeof handleGitHubWebhook>[1],
        rawBody,
        signature
      );

      if (
        !result.handled &&
        (result.message.includes("Invalid") || result.message.includes("not configured"))
      ) {
        const status = result.message.includes("not configured") ? 500 : 401;
        return reply.status(status).send(err(result.message));
      }

      return reply.send(ok(result));
    },
  });

  app.post("/webhooks/gitlab", {
    config: { rawBody: true },
    handler: async (req, reply) => {
      const event = (req.headers["x-gitlab-event"] as string) ?? "";
      const token = (req.headers["x-gitlab-token"] as string) ?? "";
      const rawBody = (req as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

      const result = await handleGitLabWebhook(
        event,
        req.body as Parameters<typeof handleGitLabWebhook>[1],
        rawBody,
        token
      );

      if (
        !result.handled &&
        (result.message.includes("Invalid") || result.message.includes("not configured"))
      ) {
        const status = result.message.includes("not configured") ? 500 : 401;
        return reply.status(status).send(err(result.message));
      }

      return reply.send(ok(result));
    },
  });

  app.post("/webhooks/bitbucket", {
    config: { rawBody: true },
    handler: async (req, reply) => {
      const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
      if (secret) {
        const header = (req.headers["x-hub-signature"] as string) ?? "";
        const rawBody = (req as { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
        const crypto = await import("crypto");
        const expected =
          "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        if (!header || header !== expected) {
          return reply.status(401).send(err("Invalid Bitbucket webhook signature"));
        }
      } else if (process.env.NODE_ENV === "production") {
        return reply.status(500).send(err("BITBUCKET_WEBHOOK_SECRET not configured"));
      }

      const event = (req.headers["x-event-key"] as string) ?? "";
      const result = await handleBitbucketWebhook(
        event,
        req.body as Parameters<typeof handleBitbucketWebhook>[1]
      );
      return reply.send(ok(result));
    },
  });
};
