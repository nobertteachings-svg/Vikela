import { prisma } from "../../lib/prisma.js";
import { decrypt } from "../../lib/crypto.js";
import type { LiteScanGitProvider } from "../../lib/product-events.js";
import { getGitProvider, toGitProviderName, type GitProviderName } from "../git/provider.factory.js";
import { resolveGithubAccessToken } from "../git/github/github-token.js";
import { detectRepoStack } from "./detect-repo-stack.js";
import { executeCodeScan } from "./execute-code-scan.js";
import { finalizeLiteScan } from "./finalize-lite-scan.js";
import { scanQueue } from "../../jobs/scan.job.js";
import type { Integration, Repository } from "@prisma/client";

export type LiteScanStatus = {
  scanId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  source?: "repo" | "sample" | "mixed";
  findingCount?: number;
  score?: number;
  repoFullName?: string;
  repoStack?: string;
  hasSampleGaps?: boolean;
  error?: string;
};

type RepoWithGit = Repository & { integration: Integration };

function liteScanProvider(gitName: GitProviderName | null): LiteScanGitProvider | undefined {
  return gitName ?? undefined;
}

async function detectStackForRepo(
  repo: RepoWithGit
): Promise<{
  stack: import("./detect-repo-stack.js").RepoStack;
  listFailed: boolean;
  provider?: LiteScanGitProvider;
}> {
  const gitName = toGitProviderName(repo.integration.provider);
  if (!gitName) return { stack: "generic", listFailed: false };

  try {
    const token =
      gitName === "github"
        ? await resolveGithubAccessToken(repo.integration)
        : decrypt(repo.integration.accessToken);
    const git = getGitProvider(gitName, token);
    const listing = await git.listFiles(repo.fullName, repo.defaultBranch);
    return {
      stack: detectRepoStack(listing.files, { directoryNames: listing.directoryNames }),
      listFailed: false,
      provider: liteScanProvider(gitName),
    };
  } catch (e) {
    console.warn(`Stack detection listFiles failed for ${repo.fullName}:`, e);
    return { stack: "generic", listFailed: true, provider: liteScanProvider(gitName) };
  }
}

/** Dev / no-repo path: sample gaps only, clearly labeled. */
export async function runDevLiteScan(orgId: string): Promise<LiteScanStatus> {
  const repo = await prisma.repository.findFirst({
    where: { orgId, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { integration: true },
  });

  const stackInfo = repo ? await detectStackForRepo(repo) : null;
  const stack = stackInfo?.stack ?? "generic";

  const scan = await prisma.scan.create({
    data: {
      orgId,
      repoId: repo?.id,
      integrationId: repo?.integrationId,
      scanType: "CODE",
      status: "RUNNING",
      isLiteScan: true,
      branch: repo?.defaultBranch,
    },
  });

  const result = await finalizeLiteScan({
    scanId: scan.id,
    orgId,
    repoId: repo?.id ?? "",
    repoStack: stack,
    realGapCount: 0,
    realFindings: [],
    noRepo: !repo,
    listFailed: false,
    filesListed: 0,
    provider: stackInfo?.provider,
  });

  return {
    scanId: scan.id,
    status: "COMPLETED",
    source: result.source,
    findingCount: result.findingCount,
    score: result.score,
    repoFullName: repo?.fullName,
    repoStack: stack,
    hasSampleGaps: true,
  };
}

export async function startLiteScan(
  orgId: string,
  preferredRepoId?: string
): Promise<LiteScanStatus> {
  const existing = await prisma.scan.findFirst({
    where: { orgId, isLiteScan: true, status: { in: ["PENDING", "RUNNING"] } },
    orderBy: { startedAt: "desc" },
    include: { repo: true },
  });
  if (existing) {
    return mapScanStatus(existing);
  }

  const repo = preferredRepoId
    ? await prisma.repository.findFirst({
        where: { id: preferredRepoId, orgId, isActive: true },
        include: { integration: true },
      })
    : await prisma.repository.findFirst({
        where: { orgId, isActive: true },
        orderBy: { createdAt: "asc" },
        include: { integration: true },
      });

  if (!repo) {
    return runDevLiteScan(orgId);
  }

  const gitName = toGitProviderName(repo.integration.provider);
  const {
    stack: repoStack,
    listFailed: stackListFailed,
    provider,
  } = await detectStackForRepo(repo);

  const scan = await prisma.scan.create({
    data: {
      orgId,
      repoId: repo.id,
      integrationId: repo.integrationId,
      scanType: "CODE",
      status: "PENDING",
      isLiteScan: true,
      branch: repo.defaultBranch,
    },
  });

  const workerDisabled = process.env.DISABLE_SCAN_WORKER === "true";

  if (workerDisabled) {
    try {
      await prisma.scan.update({ where: { id: scan.id }, data: { status: "RUNNING" } });
      const result = await executeCodeScan({
        repoId: repo.id,
        branch: repo.defaultBranch,
        scanId: scan.id,
      });
      const finalized = await finalizeLiteScan({
        scanId: scan.id,
        orgId,
        repoId: repo.id,
        repoStack,
        realGapCount: result.gapCount,
        realFindings: result.findings,
        listFailed: result.listFailed || stackListFailed,
        filesListed: result.filesListed,
        provider,
      });
      return {
        scanId: scan.id,
        status: "COMPLETED",
        source: finalized.source,
        findingCount: finalized.findingCount,
        score: finalized.score,
        repoFullName: repo.fullName,
        repoStack,
        hasSampleGaps: finalized.source !== "repo",
      };
    } catch (e) {
      await prisma.scan.update({
        where: { id: scan.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      return {
        scanId: scan.id,
        status: "FAILED",
        error: e instanceof Error ? e.message : "Scan failed",
        repoFullName: repo.fullName,
      };
    }
  }

  await prisma.scan.update({ where: { id: scan.id }, data: { status: "RUNNING" } });

  await scanQueue.add("lite-code-scan", {
    type: "code",
    repoId: repo.id,
    branch: repo.defaultBranch,
    liteScan: true,
    liteScanId: scan.id,
    repoStack,
    stackListFailed,
    gitProvider: gitName ?? undefined,
  });

  return {
    scanId: scan.id,
    status: "RUNNING",
    repoFullName: repo.fullName,
    repoStack,
  };
}

export async function getLiteScanStatus(
  orgId: string,
  scanId: string
): Promise<LiteScanStatus | null> {
  const scan = await prisma.scan.findFirst({
    where: { id: scanId, orgId, isLiteScan: true },
    include: {
      repo: true,
      gaps: { where: { status: "OPEN" }, select: { isSample: true } },
      _count: { select: { gaps: { where: { status: "OPEN" } } } },
    },
  });
  if (!scan) return null;
  return mapScanStatus(scan);
}

function mapScanStatus(
  scan: {
    id: string;
    status: string;
    score: number | null;
    repo: { fullName: string } | null;
    gaps?: { isSample: boolean }[];
    _count?: { gaps: number };
    completedAt: Date | null;
  }
): LiteScanStatus {
  const hasSampleGaps = scan.gaps?.some((g) => g.isSample) ?? false;
  const findingCount = scan._count?.gaps ?? scan.gaps?.length;
  const source: LiteScanStatus["source"] =
    hasSampleGaps && findingCount && findingCount > 0
      ? scan.gaps?.every((g) => g.isSample)
        ? "sample"
        : "mixed"
      : scan.status === "COMPLETED"
        ? "repo"
        : undefined;

  return {
    scanId: scan.id,
    status: scan.status as LiteScanStatus["status"],
    score: scan.score ?? undefined,
    findingCount,
    repoFullName: scan.repo?.fullName,
    hasSampleGaps,
    source,
  };
}
