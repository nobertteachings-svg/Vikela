import type { ScanFinding } from "@vikela/shared";
import type { IGitProvider } from "../git/provider.interface.js";
import { scanSecrets } from "./code/secrets.js";
import { scanEncryption } from "./code/encryption.js";
import { scanLogging } from "./code/logging.js";
import { scanAccess } from "./code/access.js";
import { scanDependencies } from "./code/deps.js";
import { runFrameworkCodeScans } from "./framework-scans.js";

const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|py|go|rb|java|json|ya?ml|env\.example|tf)$/i;
const MAX_FILE_SIZE = 512_000;
const MAX_FILES = 200;

export type CodeScanRunResult = {
  findings: ScanFinding[];
  listFailed: boolean;
  filesListed: number;
};

export async function runCodeScan(
  git: IGitProvider,
  repoFullName: string,
  ref: string,
  opts?: { frameworkSlugs?: string[] }
): Promise<CodeScanRunResult> {
  const allFindings: ScanFinding[] = [];
  let listFailed = false;

  let files: string[];
  try {
    const listing = await git.listFiles(repoFullName, ref);
    files = listing.files;
  } catch (e) {
    listFailed = true;
    files = [];
    console.warn(`listFiles failed for ${repoFullName}@${ref}:`, e);
  }

  const scannable = files.filter((f) => SCANNABLE_EXT.test(f)).slice(0, MAX_FILES);

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
      ...scanSecrets(filePath, content, lines),
      ...scanEncryption(filePath, content, lines),
      ...scanLogging(filePath, content, lines),
      ...scanAccess(filePath, content, lines),
      ...scanDependencies(filePath, content)
    );

    if (opts?.frameworkSlugs?.length) {
      allFindings.push(...runFrameworkCodeScans(opts.frameworkSlugs, filePath, content, lines));
    }
  }

  return {
    findings: dedupeFindings(allFindings),
    listFailed,
    filesListed: files.length,
  };
}

function dedupeFindings(findings: ScanFinding[]): ScanFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.filePath}:${f.lineNumber}:${f.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
