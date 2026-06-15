import type { ControlStatus, FrameworkStatus, GapSource, GapStatus, Severity } from "@vikela/shared";

export type UiControlStatus = "passing" | "failing" | "in_progress" | "not_started";

export const UI_CONTROL_STATUSES: UiControlStatus[] = [
  "passing",
  "failing",
  "in_progress",
  "not_started",
];

export function mapControlStatus(status: ControlStatus, hasOpenGaps?: boolean): UiControlStatus {
  if (hasOpenGaps) return "failing";
  switch (status) {
    case "IMPLEMENTED":
      return "passing";
    case "IN_PROGRESS":
    case "NEEDS_REVIEW":
      return "in_progress";
    default:
      return "not_started";
  }
}

export function formatFrameworkStatus(status: FrameworkStatus): string {
  switch (status) {
    case "CERTIFIED":
    case "READY":
      return "Active";
    case "IN_PROGRESS":
      return "Active";
    default:
      return "Not started";
  }
}

export function formatGapStatus(status: GapStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "RESOLVED":
      return "Resolved";
    case "ACCEPTED":
      return "Accepted";
    default:
      return "Open";
  }
}

export function formatFilePath(filePath: string | null | undefined, lineNumber: number | null | undefined): string {
  if (!filePath) return "—";
  if (lineNumber != null) return `${filePath}:${lineNumber}`;
  return filePath;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function sumSeverities(counts: Record<Severity, number>, keys: Severity[] = ["CRITICAL", "HIGH", "MEDIUM"]): number {
  return keys.reduce((s, k) => s + (counts[k] ?? 0), 0);
}

/** Count severities from a gap list — matches table/chip totals when filters are applied. */
export function severityCountsFromGaps(
  gaps: { severity: string }[],
  keys: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
): Record<Severity, number> {
  const counts = Object.fromEntries(keys.map((k) => [k, 0])) as Record<Severity, number>;
  for (const gap of gaps) {
    const s = gap.severity as Severity;
    if (s in counts) counts[s] += 1;
  }
  return counts;
}

const SOURCE_LABELS: Record<string, string> = {
  CODE: "Code",
  IAM: "Identity",
  NETWORK: "Cloud",
  ENCRYPTION: "Cloud",
  LOGGING: "Cloud",
  BACKUP: "Cloud",
  MONITORING: "Cloud",
};

export const CLOUD_GAP_SOURCES: GapSource[] = [
  "NETWORK",
  "ENCRYPTION",
  "LOGGING",
  "BACKUP",
  "MONITORING",
];

export const CLOUD_GAP_SOURCES_PARAM = CLOUD_GAP_SOURCES.join(",");

export type GapListStatus = "OPEN" | "RESOLVED";

export function gapsListEmptyState(params: {
  status: GapListStatus;
  hasFilters: boolean;
}): { title: string; body: string } {
  if (params.status === "RESOLVED") {
    return {
      title: "No resolved gaps yet",
      body: "Open gaps appear on the Open tab. Mark one resolved from its detail page to track progress here.",
    };
  }
  if (params.hasFilters) {
    return {
      title: "No open gaps",
      body: "Nothing matches your filters, or you're clean for this period. Run a scan or widen filters to see findings.",
    };
  }
  return {
    title: "No open gaps",
    body: "Scans haven't surfaced open findings. Connect a repo or run a scan to get started.",
  };
}

export function formatResolvedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Map `?source=` URL value to toolbar dropdown selection. */
export function gapSourceFilterSelection(sourceParam: string | undefined): string {
  if (!sourceParam) return "";
  const parts = sourceParam.split(",").map((s) => s.trim()).filter(Boolean).sort();
  if (parts.length === 1) {
    if (parts[0] === "CODE" || parts[0] === "IAM") return parts[0]!;
  }
  const cloudSorted = [...CLOUD_GAP_SOURCES].sort();
  if (parts.length === cloudSorted.length && parts.every((p, i) => p === cloudSorted[i])) {
    return "CLOUD";
  }
  return sourceParam;
}

export function formatGapSource(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/** Aggregate open gaps into code / cloud / identity buckets for dashboard. */
export function gapsByStack(counts: Record<string, number>): {
  code: number;
  cloud: number;
  identity: number;
} {
  const code = counts.CODE ?? 0;
  const identity = counts.IAM ?? 0;
  const cloud =
    (counts.NETWORK ?? 0) +
    (counts.ENCRYPTION ?? 0) +
    (counts.LOGGING ?? 0) +
    (counts.BACKUP ?? 0) +
    (counts.MONITORING ?? 0);
  return { code, cloud, identity };
}

export function likelihoodLabel(n: number): string {
  if (n <= 1) return "Low";
  if (n === 2) return "Medium";
  return "High";
}

export function reviewStatusLabel(status: string): string {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "IN_REVIEW":
      return "Review needed";
    case "REJECTED":
      return "Rejected";
    default:
      return "Not reviewed";
  }
}
