import { prisma } from "../../lib/prisma.js";
import { decrypt } from "../../lib/crypto.js";
import { getApiPublicUrl } from "../../lib/app-url.js";

const GITLAB_HOST = process.env.GITLAB_HOST ?? "https://gitlab.com";

/**
 * Best-effort: register push/MR webhooks on synced GitLab/Bitbucket repos.
 * Failures are logged and never block OAuth/sync, local/dev often lacks a public URL.
 */
export async function ensureGitWebhooks(integrationId: string): Promise<{
  attempted: number;
  created: number;
  skipped: number;
}> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: { repositories: { where: { isActive: true } } },
  });

  if (!integration || !integration.isActive) {
    return { attempted: 0, created: 0, skipped: 0 };
  }

  if (integration.provider !== "GITLAB" && integration.provider !== "BITBUCKET") {
    return { attempted: 0, created: 0, skipped: 0 };
  }

  const base = getApiPublicUrl();
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) {
    // Webhooks require a provider-reachable URL; skip quietly in local defaults.
    return { attempted: 0, created: 0, skipped: integration.repositories.length };
  }

  const token = decrypt(integration.accessToken);
  let created = 0;
  let attempted = 0;

  if (integration.provider === "GITLAB") {
    const secret = process.env.GITLAB_WEBHOOK_SECRET;
    if (!secret) {
      return { attempted: 0, created: 0, skipped: integration.repositories.length };
    }
    const hookUrl = `${base.replace(/\/$/, "")}/api/v1/webhooks/gitlab`;
    for (const repo of integration.repositories) {
      attempted += 1;
      try {
        const projectId = encodeURIComponent(repo.fullName);
        const res = await fetch(`${GITLAB_HOST}/api/v4/projects/${projectId}/hooks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: hookUrl,
            token: secret,
            push_events: true,
            merge_requests_events: true,
            enable_ssl_verification: true,
          }),
        });
        // 409 / already exists → treat as success for our purposes
        if (res.ok || res.status === 409) created += 1;
      } catch {
        /* best-effort */
      }
    }
  }

  if (integration.provider === "BITBUCKET") {
    const secret = process.env.BITBUCKET_WEBHOOK_SECRET;
    if (!secret) {
      return { attempted: 0, created: 0, skipped: integration.repositories.length };
    }
    const hookUrl = `${base.replace(/\/$/, "")}/api/v1/webhooks/bitbucket`;
    for (const repo of integration.repositories) {
      attempted += 1;
      const [workspace, slug] = repo.fullName.split("/");
      if (!workspace || !slug) continue;
      try {
        const res = await fetch(
          `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(slug)}/hooks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: "Vikela compliance scans",
              url: hookUrl,
              active: true,
              secret,
              events: ["repo:push", "pullrequest:created", "pullrequest:updated"],
            }),
          }
        );
        if (res.ok || res.status === 409) created += 1;
      } catch {
        /* best-effort */
      }
    }
  }

  const meta =
    integration.metadata && typeof integration.metadata === "object" && !Array.isArray(integration.metadata)
      ? (integration.metadata as Record<string, unknown>)
      : {};

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      metadata: {
        ...meta,
        webhooks: {
          lastAttemptAt: new Date().toISOString(),
          attempted,
          created,
        },
      },
    },
  });

  return { attempted, created, skipped: Math.max(0, attempted - created) };
}
