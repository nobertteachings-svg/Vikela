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
const MAX_FILES = 150;
/** Parallel file fetches — keep modest to avoid GitHub secondary rate limits. */
const FILE_FETCH_CONCURRENCY = 6;

export type CodeScanRunResult = {
  findings: ScanFinding[];
  listFailed: boolean;
  filesListed: number;
};

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

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

  const perFileFindings = await mapPool(scannable, FILE_FETCH_CONCURRENCY, async (filePath) => {
    let content: string;
    try {
      content = await git.getFileContent(repoFullName, filePath, ref);
    } catch {
      return [] as ScanFinding[];
    }
    if (content.length > MAX_FILE_SIZE) return [] as ScanFinding[];

    const lines = content.split("\n");
    const findings: ScanFinding[] = [
      ...scanSecrets(filePath, content, lines),
      ...scanEncryption(filePath, content, lines),
      ...scanLogging(filePath, content, lines),
      ...scanAccess(filePath, content, lines),
      ...scanDependencies(filePath, content),
    ];
    if (opts?.frameworkSlugs?.length) {
      findings.push(...runFrameworkCodeScans(opts.frameworkSlugs, filePath, content, lines));
    }
    return findings;
  });

  for (const batch of perFileFindings) {
    allFindings.push(...batch);
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
