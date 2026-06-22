import { prisma } from "../../../lib/prisma.js";
import { scanQueue } from "../../../jobs/scan.job.js";
import { GithubProvider } from "./github.provider.js";

export interface GitHubWebhookPayload {
  action?: string;
  installation?: { id: number };
  repository?: {
    id: number;
    full_name: string;
    name: string;
    default_branch?: string;
  };
  pull_request?: {
    number: number;
    head: { ref: string; sha: string };
  };
  ref?: string;
  after?: string;
}

export async function handleGitHubWebhook(
  event: string,
  payload: GitHubWebhookPayload,
  rawBody: string,
  signature: string
): Promise<{ handled: boolean; message: string }> {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return { handled: false, message: "GITHUB_WEBHOOK_SECRET not configured" };
  }

  const verifier = new GithubProvider("");
  if (secret) {
    if (!signature || !verifier.verifyWebhookSignature(rawBody, signature, secret)) {
      return { handled: false, message: "Invalid signature" };
    }
  } else if (isProd) {
    return { handled: false, message: "Invalid signature" };
  }

  if (event === "installation" && payload.action === "created" && payload.installation) {
    const integration = await prisma.integration.findFirst({
      where: {
        provider: "GITHUB",
        externalId: String(payload.installation.id),
        isActive: true,
      },
    });
    if (integration) {
      const { syncGitRepositories } = await import("../sync-repositories.js");
      const count = await syncGitRepositories(integration.id);
      return {
        handled: true,
        message: `Installation ${payload.installation.id} synced ${count} repositories`,
      };
    }
    return {
      handled: true,
      message: `Installation ${payload.installation.id} created — complete setup via OAuth callback`,
    };
  }

  if (event === "installation_repositories" && payload.action === "added" && payload.installation) {
    const integration = await prisma.integration.findFirst({
      where: {
        provider: "GITHUB",
        externalId: String(payload.installation.id),
        isActive: true,
      },
    });
    if (integration) {
      const { syncGitRepositories } = await import("../sync-repositories.js");
      const count = await syncGitRepositories(integration.id);
      return {
        handled: true,
        message: `Synced ${count} repositories after installation_repositories.added`,
      };
    }
  }

  const fullName = payload.repository?.full_name;
  if (!fullName) {
    return { handled: false, message: "No repository in payload" };
  }

  const repo = await prisma.repository.findFirst({
    where: { fullName, isActive: true },
  });

  if (!repo) {
    return { handled: false, message: `Repository ${fullName} not linked` };
  }

  if (event === "pull_request") {
    const action = payload.action;
    if (!["opened", "synchronize", "reopened"].includes(action ?? "")) {
      return { handled: true, message: `Ignored PR action: ${action}` };
    }

    const pr = payload.pull_request;
    if (!pr) return { handled: false, message: "Missing pull_request" };

    await scanQueue.add(
      "code-scan",
      {
        type: "code",
        repoId: repo.id,
        branch: pr.head.ref,
        prNumber: pr.number,
        commitSha: pr.head.sha,
        postPrComments: true,
      },
      { jobId: `pr-${repo.id}-${pr.number}-${pr.head.sha.slice(0, 7)}` }
    );

    return { handled: true, message: `Queued PR #${pr.number} scan for ${fullName}` };
  }

  if (event === "push") {
    const branch = payload.ref?.replace("refs/heads/", "") ?? repo.defaultBranch;
    const sha = payload.after;
    if (!sha || sha === "0000000000000000000000000000000000000000") {
      return { handled: true, message: "Branch deleted, skip scan" };
    }

    await scanQueue.add(
      "code-scan",
      {
        type: "code",
        repoId: repo.id,
        branch,
        commitSha: sha,
      },
      { jobId: `push-${repo.id}-${sha.slice(0, 7)}` }
    );

    return { handled: true, message: `Queued push scan for ${fullName}@${branch}` };
  }

  return { handled: false, message: `Unhandled event: ${event}` };
}
