export type SeverityCountKey = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ScanScoreResult = {
  score: number;
  /** Baseline check budget used for passed/failed accounting. */
  totalChecks: number;
  passedChecks: number;
};

export type ScoreableFinding = {
  severity: string;
  /** Prefer title (or controlCode+title) so duplicate file hits count as one issue. */
  title?: string;
  controlCode?: string | null;
};

const SEVERITY_RANK: Record<SeverityCountKey, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const SEVERITY_WEIGHT: Record<SeverityCountKey, number> = {
  CRITICAL: 14,
  HIGH: 6,
  MEDIUM: 2.5,
  LOW: 1,
  INFO: 0.25,
};

function asSeverity(raw: string): SeverityCountKey {
  const key = raw.toUpperCase() as SeverityCountKey;
  return key in SEVERITY_WEIGHT ? key : "INFO";
}

function findingKey(f: ScoreableFinding): string {
  const title = (f.title ?? "").trim().toLowerCase();
  const control = (f.controlCode ?? "").trim().toLowerCase();
  if (title || control) return `${control}::${title}`;
  return `anon::${asSeverity(f.severity)}`;
}

/**
 * Posture score from findings.
 * Deduplicates by title/control so the same rule firing in 50 files does not
 * drive the score to 0. Applies a small multiplicity bonus for fan-out.
 */
export function computeScanScoreFromFindings(
  findings: ScoreableFinding[],
  opts?: { baselineChecks?: number }
): ScanScoreResult {
  const groups = new Map<string, { severity: SeverityCountKey; count: number }>();

  for (const f of findings) {
    const severity = asSeverity(f.severity);
    const key = findingKey(f);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { severity, count: 1 });
      continue;
    }
    existing.count += 1;
    if (SEVERITY_RANK[severity] < SEVERITY_RANK[existing.severity]) {
      existing.severity = severity;
    }
  }

  let penalty = 0;
  for (const group of groups.values()) {
    const weight = SEVERITY_WEIGHT[group.severity];
    const extras = Math.min(Math.max(0, group.count - 1), 25);
    penalty += weight + extras * weight * 0.04;
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const gapCount = findings.length;
  const totalChecks = Math.max(opts?.baselineChecks ?? 40, gapCount);
  const passedChecks = Math.max(0, totalChecks - gapCount);

  return { score, totalChecks, passedChecks };
}

/** Convenience when only severities are available (no titles). */
export function computeScanScoreFromSeverities(
  severities: Iterable<string>,
  opts?: { baselineChecks?: number }
): ScanScoreResult {
  return computeScanScoreFromFindings(
    [...severities].map((severity, i) => ({
      severity,
      title: `finding-${i}-${severity}`,
    })),
    opts
  );
}
