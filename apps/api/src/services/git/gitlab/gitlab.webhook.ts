import { prisma } from "../../../lib/prisma.js";
import { scanQueue } from "../../../jobs/scan.job.js";
import { GitlabProvider } from "./gitlab.provider.js";

export async function handleGitLabWebhook(
  event: string,
  payload: {
    project?: { path_with_namespace: string };
    object_attributes?: {
      iid?: number;
      source_branch?: string;
      last_commit?: { id: string };
      action?: string;
    };
    ref?: string;
    after?: string;
  },
  rawBody: string,
  token: string
): Promise<{ handled: boolean; message: string }> {
  const secret = process.env.GITLAB_WEBHOOK_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return { handled: false, message: "GITLAB_WEBHOOK_SECRET not configured" };
  }

  if (secret) {
    const verifier = new GitlabProvider("");
    if (!token || !verifier.verifyWebhookSignature(rawBody, token, secret)) {
      return { handled: false, message: "Invalid GitLab token" };
    }
  } else if (isProd) {
    return { handled: false, message: "Invalid GitLab token" };
  }

  const fullName = payload.project?.path_with_namespace;
  if (!fullName) return { handled: false, message: "No project in payload" };

  const repo = await prisma.repository.findFirst({ where: { fullName, isActive: true } });
  if (!repo) return { handled: false, message: `Repository ${fullName} not linked` };

  if (event === "Merge Request Hook") {
    const attrs = payload.object_attributes;
    if (!attrs || !["open", "update"].includes(attrs.action ?? "")) {
      return { handled: true, message: `Ignored MR action: ${attrs?.action}` };
    }

    await scanQueue.add("code-scan", {
      type: "code",
      repoId: repo.id,
      branch: attrs.source_branch,
      prNumber: attrs.iid,
      commitSha: attrs.last_commit?.id,
      postPrComments: true,
    });

    return { handled: true, message: `Queued MR !${attrs.iid} scan` };
  }

  if (event === "Push Hook") {
    const branch = payload.ref?.replace("refs/heads/", "") ?? repo.defaultBranch;
    await scanQueue.add("code-scan", {
      type: "code",
      repoId: repo.id,
      branch,
      commitSha: payload.after,
    });
    return { handled: true, message: `Queued push scan for ${fullName}` };
  }

  return { handled: false, message: `Unhandled GitLab event: ${event}` };
}
