import type { GapSource } from "@vikela/shared";

export const GAP_SOURCES: GapSource[] = [
  "CODE",
  "IAM",
  "NETWORK",
  "ENCRYPTION",
  "LOGGING",
  "BACKUP",
  "MONITORING",
];

/** Comma-separated `?source=` values → Prisma filter (single enum or `{ in: [...] }`). */
export function parseGapSourceFilter(source?: string): GapSource[] | undefined {
  if (!source?.trim()) return undefined;
  const parts = source.split(",").map((s) => s.trim()).filter(Boolean);
  const valid = parts.filter((p): p is GapSource => GAP_SOURCES.includes(p as GapSource));
  if (valid.length === 0) return undefined;
  return valid;
}

export function gapSourceWhere(sources: GapSource[] | undefined) {
  if (!sources?.length) return {};
  if (sources.length === 1) return { source: sources[0] };
  return { source: { in: sources } };
}

/** Open gaps that are not onboarding/lite samples — use for RAG, Copilot, and policy generation. */
export function openRealGapsWhere(orgId: string) {
  return { orgId, status: "OPEN" as const, isSample: false };
}
