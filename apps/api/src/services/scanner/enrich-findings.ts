import type { ScanFinding } from "@vikela/shared";
import { generateRemediation } from "../../lib/claude.js";

/** Cap AI enrichment so full scans finish even when Anthropic is slow. */
const MAX_AI_ENRICHMENTS = 8;
const ENRICH_CONCURRENCY = 2;
const OVERALL_BUDGET_MS = 90_000;

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export async function enrichFindingsWithRemediation(
  findings: ScanFinding[],
  orgName: string
): Promise<ScanFinding[]> {
  if (findings.length === 0) return findings;

  const ranked = findings
    .map((f, index) => ({ f, index }))
    .sort((a, b) => {
      const sa = SEVERITY_RANK[a.f.severity] ?? 9;
      const sb = SEVERITY_RANK[b.f.severity] ?? 9;
      return sa - sb || a.index - b.index;
    });

  const toEnrich = ranked.slice(0, MAX_AI_ENRICHMENTS);
  const enrichedByIndex = new Map<number, string>();
  const started = Date.now();
  let cursor = 0;

  async function worker() {
    while (cursor < toEnrich.length) {
      if (Date.now() - started > OVERALL_BUDGET_MS) return;
      const i = cursor++;
      const item = toEnrich[i];
      if (!item) return;
      try {
        const remediation = await generateRemediation({
          orgName,
          findingTitle: item.f.title,
          findingDescription: item.f.description,
          filePath: item.f.filePath,
          lineNumber: item.f.lineNumber,
          codeSnippet: item.f.codeSnippet,
          controlCode: item.f.controlCode,
        });
        enrichedByIndex.set(item.index, remediation);
      } catch (e) {
        console.warn("Remediation enrichment skipped:", e instanceof Error ? e.message : e);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, toEnrich.length) }, () => worker())
  );

  return findings.map((finding, index) => ({
    ...finding,
    remediation: enrichedByIndex.get(index) ?? finding.remediation,
  }));
}
