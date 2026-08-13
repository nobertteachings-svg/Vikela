import type { ScanFinding } from "@vikela/shared";
import type { IGitProvider } from "../git/provider.interface.js";
import { runCodeScan } from "./index.js";
import { enrichFindingsWithRemediation } from "./enrich-findings.js";
import { persistGaps } from "./persist-gaps.js";
import { prisma } from "../../lib/prisma.js";
import { emitScanCompleted } from "../../lib/dispatch-org-webhooks.js";
import { notifyScanEmails } from "../../lib/notify-scan-emails.js";
import { scanSecrets } from "./code/secrets.js";
import { scanEncryption } from "./code/encryption.js";
import { scanLogging } from "./code/logging.js";
import { scanAccess } from "./code/access.js";
import { scanDependencies } from "./code/deps.js";
import {
  filterFindingsForScope,
  getOrgFrameworkScanScope,
} from "./framework-scope.js";
import { runFrameworkCodeScans } from "./framework-scans.js";
import { getGitProvider, toGitProviderName } from "../git/provider.factory.js";
import { resolveGithubAccessToken } from "../git/github/github-token.js";
import { decrypt } from "../../lib/crypto.js";
import { computeScanScoreFromFindings } from "../../lib/scan-score.js";

const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|py|go|rb|java|json|ya?ml|env\.example|tf)$/i;
const MAX_FILE_SIZE = 512_000;

export interface CodeScanOptions {
  repoId: string;
  branch?: string;
  prNumber?: number;
  commitSha?: string;
  postPrComments?: boolean;
  /** Reuse an existing scan row (lite scan onboarding). */
  scanId?: string;
  /** When set, links this scan as a child of a FULL scan run. */
  parentScanId?: string;
}

export async function executeCodeScan(options: CodeScanOptions) {
  const repo = await prisma.repository.findUnique({
    where: { id: options.repoId },
    include: { integration: true, org: true },
  });

  if (!repo) throw new Error("Repository not found");

  const ref = options.commitSha ?? options.branch ?? repo.defaultBranch;

  const scan = options.scanId
    ? await prisma.scan.update({
        where: { id: options.scanId },
        data: {
          status: "RUNNING",
          branch: options.branch ?? repo.defaultBranch,
          commitSha: options.commitSha,
          prNumber: options.prNumber,
        },
      })
    : await prisma.scan.create({
        data: {
          orgId: repo.orgId,
          integrationId: repo.integrationId,
          repoId: repo.id,
          parentScanId: options.parentScanId,
          scanType: "CODE",
          branch: options.branch ?? repo.defaultBranch,
          commitSha: options.commitSha,
          prNumber: options.prNumber,
          status: "RUNNING",
        },
      });

  const gitName = toGitProviderName(repo.integration.provider);
  if (!gitName) throw new Error("Not a git integration");

  const token =
    gitName === "github"
      ? await resolveGithubAccessToken(repo.integration)
      : decrypt(repo.integration.accessToken);

  const git = getGitProvider(gitName, token);

  const scope = await getOrgFrameworkScanScope(repo.orgId);

  let findings: ScanFinding[];
  let listFailed = false;
  let filesListed = 0;

  if (options.prNumber) {
    findings = await runCodeScanOnPRFiles(
      git,
      repo.fullName,
      options.prNumber,
      ref,
      scope.frameworkSlugs
    );
  } else {
    const scanResult = await runCodeScan(git, repo.fullName, ref, {
      frameworkSlugs: scope.frameworkSlugs,
    });
    findings = scanResult.findings;
    listFailed = scanResult.listFailed;
    filesListed = scanResult.filesListed;
  }

  findings = filterFindingsForScope(findings, scope);
  findings = await enrichFindingsWithRemediation(findings, repo.org.name);

  const gapCount = await persistGaps({
    orgId: repo.orgId,
    scanId: scan.id,
    repoId: repo.id,
    cloudAccountId: null,
    findings,
  });

  const { score, totalChecks, passedChecks } = computeScanScoreFromFindings(findings, {
    baselineChecks: 40,
  });

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      status: "COMPLETED",
      score,
      totalChecks,
      passedChecks,
      completedAt: new Date(),
    },
  });

  emitScanCompleted(repo.orgId, {
    id: scan.id,
    scanType: scan.scanType,
    status: "COMPLETED",
    score,
    gapCount,
    isLiteScan: scan.isLiteScan ?? false,
    completedAt: new Date(),
  });

  notifyScanEmails(repo.orgId, {
    scanId: scan.id,
    scanType: scan.scanType,
    score,
    gapCount,
    isLiteScan: scan.isLiteScan ?? false,
  });

  await prisma.repository.update({
    where: { id: repo.id },
    data: { lastScannedAt: new Date() },
  });

  if (options.postPrComments !== false && options.prNumber) {
    await postPrReviewComments(git, repo.fullName, options.prNumber, options.commitSha, findings);
  }

  return { scanId: scan.id, gapCount, score, findings, listFailed, filesListed };
}

async function runCodeScanOnPRFiles(
  git: IGitProvider,
  repoFullName: string,
  prNumber: number,
  ref: string,
  frameworkSlugs: string[] = []
): Promise<ScanFinding[]> {
  const prFiles = await git.getPRFiles(repoFullName, prNumber);
  const scannable = prFiles.filter((f) => SCANNABLE_EXT.test(f));
  const allFindings: ScanFinding[] = [];

  for (const filePath of scannable) {
    let content: string;
    try {
      content = await git.getFileContent(repoFullName, filePath, ref);
    } catch {
      continue;
    }
    if (content.length > MAX_FILE_SIZE) continue;
    const lines = content.split("\n");
    allFindings.push(
      ...scanSecrets(filePath, content, lines), ...scanEncryption(filePath, content, lines), ...scanLogging(filePath, content, lines), ...scanAccess(filePath, content, lines), ...scanDependencies(filePath, content), ...runFrameworkCodeScans(frameworkSlugs, filePath, content, lines)
    );
  }

  const seen = new Set<string>();
  return allFindings.filter((f) => {
    const key = `${f.filePath}:${f.lineNumber}:${f.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function postPrReviewComments(
  git: IGitProvider,
  repoFullName: string,
  prNumber: number,
  commitSha: string | undefined,
  findings: ScanFinding[]
) {
  const top = findings
    .filter((f) => f.filePath && f.severity !== "INFO")
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    .slice(0, 5);

  if (top.length === 0) return;

  const summary = [
    "## Vikela Compliance Scan",
    "",
    `Found **${findings.length}** potential compliance issue(s) in this PR.`,
    "", ...top.map(
      (f) =>
        `- **${f.severity}** \`${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ""}\`, ${f.title}`
    ),
    "",
    "_Powered by [Vikela](https://vikela.dev). Protect. Shield. Comply._",
  ].join("\n");

  await git.commentOnPR(repoFullName, prNumber, { body: summary });

  if (!git.commentOnPRReview || !commitSha) return;

  for (const f of top.slice(0, 3)) {
    if (!f.filePath || !f.lineNumber) continue;
    try {
      await git.commentOnPRReview(repoFullName, prNumber, {
        body: `**${f.severity}**: ${f.title}\n\n${f.remediation.slice(0, 500)}`,
        path: f.filePath,
        line: f.lineNumber,
        commitSha,
        side: "RIGHT",
      });
    } catch {
      // Inline comments may fail on unchanged lines
    }
  }
}

function severityRank(s: string): number {
  const order: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };
  return order[s] ?? 5;
}
