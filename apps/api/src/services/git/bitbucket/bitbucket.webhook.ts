import { prisma } from "../../../lib/prisma.js";
import { scanQueue } from "../../../jobs/scan.job.js";

export async function handleBitbucketWebhook(
  event: string,
  payload: {
    repository?: { full_name: string };
    pullrequest?: { id: number; source: { branch: { name: string }; commit: { hash: string } } };
    push?: { changes: Array<{ new: { name: string; target: { hash: string } } }> };
  }
): Promise<{ handled: boolean; message: string }> {
  const fullName = payload.repository?.full_name;
  if (!fullName) return { handled: false, message: "No repository" };

  const repo = await prisma.repository.findFirst({ where: { fullName, isActive: true } });
  if (!repo) return { handled: false, message: `Repository ${fullName} not linked` };

  if (event === "pullrequest:created" || event === "pullrequest:updated") {
    const pr = payload.pullrequest;
    if (!pr) return { handled: false, message: "Missing pullrequest" };

    await scanQueue.add("code-scan", {
      type: "code",
      repoId: repo.id,
      branch: pr.source.branch.name,
      prNumber: pr.id,
      commitSha: pr.source.commit.hash,
      postPrComments: true,
    });

    return { handled: true, message: `Queued PR #${pr.id} scan` };
  }

  if (event === "repo:push") {
    const change = payload.push?.changes[0]?.new;
    if (!change) return { handled: true, message: "No new branch" };

    await scanQueue.add("code-scan", {
      type: "code",
      repoId: repo.id,
      branch: change.name,
      commitSha: change.target.hash,
    });

    return { handled: true, message: `Queued push scan` };
  }

  return { handled: false, message: `Unhandled Bitbucket event: ${event}` };
}
