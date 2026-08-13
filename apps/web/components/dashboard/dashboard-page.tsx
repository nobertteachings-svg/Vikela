import Link from "next/link";
import {
  IconAlertTriangle,
  IconBrandAws,
  IconCloud,
  IconCode,
  IconFingerprint,
  IconScan,
  IconArrowRight,
  IconFileText,
} from "@tabler/icons-react";
import type { DashboardStats, ScanType } from "@vikela/shared";
import type { FrameworkRow, GapRow, OrgInfo, EvidenceCoverage } from "@/lib/compliance-api";
import { PostureArc } from "@/components/comply/posture-arc";
import { SeverityBadge } from "@/components/comply/severity-badge";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { StatCard } from "@/components/comply/stat-card";
import { DataTable } from "@/components/comply/data-table";
import { DashboardFrameworkPicker } from "@/components/dashboard/dashboard-framework-picker";
import { FullScanButton } from "@/components/dashboard/FullScanButton";
import { GapSampleBadge } from "@/components/gaps/gap-sample-badge";
import { SeverityBreakdownBar } from "@/components/dashboard/severity-breakdown-bar";
import {
  CLOUD_GAP_SOURCES_PARAM,
  formatGapSource,
  formatGapStatus,
  gapsByStack,
  sumSeverities,
  timeAgo,
} from "@/lib/format";
import type { Severity } from "@vikela/shared";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-comply-text-tertiary">
      {children}
    </p>
  );
}

const SCAN_TYPE_LABEL: Record<ScanType, string> = {
  CODE: "Code scan",
  CLOUD: "Cloud scan",
  IDENTITY: "Identity scan",
  FULL: "Full scan",
};

const EMPTY_SEVERITY: DashboardStats["gapsBySeverity"] = {
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
  INFO: 0,
};

const EMPTY_SOURCE: DashboardStats["gapsBySource"] = {
  CODE: 0,
  IAM: 0,
  NETWORK: 0,
  ENCRYPTION: 0,
  LOGGING: 0,
  BACKUP: 0,
  MONITORING: 0,
};

/** Tolerate older API responses missing newer dashboard fields. */
export function normalizeDashboardStats(raw: DashboardStats): DashboardStats {
  const fw = raw.frameworks ?? [];
  const implemented =
    raw.controlsImplemented ??
    fw[0]?.controlsImplemented ??
    0;
  const total = raw.controlsTotal ?? fw[0]?.controlsTotal ?? 0;

  return {
    postureScore: raw.postureScore ?? 0,
    frameworks: fw,
    criticalGaps: raw.criticalGaps ?? [],
    scoreTrend: raw.scoreTrend ?? [],
    gapsBySeverity: { ...EMPTY_SEVERITY, ...raw.gapsBySeverity },
    gapsBySource: { ...EMPTY_SOURCE, ...raw.gapsBySource },
    cloudAccounts: raw.cloudAccounts ?? [],
    connectedIntegrations: raw.connectedIntegrations ?? 0,
    controlsTotal: total,
    controlsImplemented: implemented,
    recentScans: raw.recentScans ?? [],
    hasSampleGaps: raw.hasSampleGaps ?? false,
    liteScanSource: raw.liteScanSource ?? null,
  };
}

function buildRecentActivity(stats: DashboardStats, topGaps: GapRow[]) {
  type Item = { time: string; icon: "scan" | "alert" | "document"; text: string };
  const items: Item[] = [];

  for (const scan of (stats.recentScans ?? []).filter((s) => s.status === "COMPLETED").slice(0, 3)) {
    const when = scan.completedAt ? timeAgo(scan.completedAt) : "Recent";
    items.push({
      time: when,
      icon: "scan",
      text: `${SCAN_TYPE_LABEL[scan.scanType]}${scan.target ? `, ${scan.target}` : ""} · ${scan.gapsFound} gaps${scan.score != null ? ` · score ${scan.score}` : ""}`,
    });
  }

  for (const gap of topGaps.slice(0, 3)) {
    items.push({
      time: timeAgo(gap.createdAt),
      icon: "alert",
      text: `${gap.severity} gap, ${gap.title}${gap.filePath ? ` in ${gap.filePath}` : ""}`,
    });
  }

  if ((stats.scoreTrend ?? []).length > 0 && items.length < 5) {
    const last = stats.scoreTrend[stats.scoreTrend.length - 1];
    items.unshift({
      time: "Latest",
      icon: "document",
      text: `Posture score ${last.score}, ${new Date(last.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    });
  }

  return items.slice(0, 6);
}

const activityIcons = {
  scan: IconScan,
  alert: IconAlertTriangle,
  document: IconFileText,
};

export function DashboardPageContent({
  stats: rawStats,
  frameworks,
  topGaps,
  org,
  evidenceCoverage,
}: {
  stats: DashboardStats;
  frameworks: FrameworkRow[];
  topGaps: GapRow[];
  org: OrgInfo;
  evidenceCoverage: EvidenceCoverage;
}) {
  const stats = normalizeDashboardStats(rawStats);
  const openGaps = sumSeverities(stats.gapsBySeverity);
  const enrolledFrameworks = frameworks.filter((f) => f.enrolled);
  const activeFrameworks = enrolledFrameworks.filter((f) =>
    ["IN_PROGRESS", "READY", "CERTIFIED"].includes(f.status)
  ).length;
  const stackGaps = gapsByStack(stats.gapsBySource as Record<string, number>);
  const recentActivity = buildRecentActivity(stats, topGaps);
  const lastScanAt = (stats.recentScans ?? []).find((s) => s.completedAt)?.completedAt ?? null;

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`${org.name}. Posture from code, cloud, and identity.`}
      >
        <FullScanButton />
      </PageHeader>

      {stats.hasSampleGaps && (
        <div className="rounded-md border border-comply-amber/30 bg-comply-amber/10 px-4 py-3 text-sm text-comply-text-primary">
          <strong>Sample preview active.</strong> Some findings below are labeled examples from your
          onboarding scan
          {stats.liteScanSource === "mixed" ? " (mixed with real results)" : ""}. Run a full scan or
          connect cloud for live posture data.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card elevated>
          <CardBody className="flex flex-col items-center py-6">
            <PostureArc score={stats.postureScore} />
            <p className="mt-3 text-xs text-comply-text-tertiary">
              {lastScanAt ? `Last scan ${timeAgo(lastScanAt)}` : "No completed scan yet"}
            </p>
          </CardBody>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Open gaps" value={String(openGaps)} accent="red" />
          <StatCard
            label="Controls met"
            value={`${stats.controlsImplemented}/${stats.controlsTotal}`}
            accent="green"
          />
          <StatCard label="Active frameworks" value={String(activeFrameworks)} accent="purple" />
          <StatCard
            label="Integrations"
            value={String(stats.connectedIntegrations)}
            accent="amber"
          />
          <div className="col-span-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 lg:col-span-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-comply-text-secondary">
              <span>
                Evidence on{" "}
                <span className="font-mono font-medium text-comply-text-primary">
                  {evidenceCoverage.controlsWithEvidence}/{evidenceCoverage.totalControls}
                </span>{" "}
                controls
              </span>
              <span className="text-comply-text-tertiary" aria-hidden>
                ·
              </span>
              <span>
                Frameworks:{" "}
                {enrolledFrameworks.length > 0
                  ? enrolledFrameworks.map((f) => f.name).join(", ")
                  : "none enrolled yet"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Open gaps by severity"
          action={
            <Link href="/gaps" className="comply-link text-xs font-medium">
              View gaps
            </Link>
          }
        />
        <CardBody>
          <SeverityBreakdownBar counts={stats.gapsBySeverity} />
        </CardBody>
      </Card>

      {/* Findings by stack, from API gapsBySource */}
      <div>
        <SectionLabel>Findings by source</SectionLabel>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Code",
              count: stackGaps.code,
              icon: IconCode,
              desc: "Repos & dependencies",
              href: "/gaps?source=CODE",
            },
            {
              label: "Cloud",
              count: stackGaps.cloud,
              icon: IconCloud,
              desc: "AWS, Azure, GCP",
              href: `/gaps?source=${encodeURIComponent(CLOUD_GAP_SOURCES_PARAM)}`,
            },
            {
              label: "Identity",
              count: stackGaps.identity,
              icon: IconFingerprint,
              desc: "IAM & access",
              href: "/gaps?source=IAM",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-comply-green/35"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-comply-green">
                  <Icon size={22} stroke={1.5} />
                </span>
                <div>
                  <p className="text-sm font-medium text-comply-text-primary group-hover:text-comply-green">
                    {item.label}
                  </p>
                  <p className="font-mono text-2xl font-semibold tracking-tight text-comply-text-primary">
                    {item.count}
                  </p>
                  <p className="text-[10px] text-comply-muted">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <DashboardFrameworkPicker frameworks={frameworks} lastScanAt={lastScanAt} />

          {stats.cloudAccounts.length > 0 && (
            <Card>
              <CardHeader title="Cloud accounts" />
              <CardBody className="space-y-3">
                {stats.cloudAccounts.map((ca) => (
                  <div
                    key={ca.id}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <IconBrandAws size={18} className="text-comply-green" />
                      <div>
                        <p className="text-sm font-medium text-comply-text-primary">{ca.accountName}</p>
                        <p className="font-mono text-[10px] text-comply-text-tertiary">{ca.accountId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-comply-red">{ca.gapCount} gaps</p>
                      <p className="text-[10px] text-comply-muted">
                        {ca.lastScannedAt ? timeAgo(ca.lastScannedAt) : "Never scanned"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent activity"
            action={
              <Link href="/scans" className="comply-link text-xs font-medium">
                Scan history
              </Link>
            }
          />
          <CardBody>
            <ul className="space-y-4">
              {recentActivity.length === 0 ? (
                <li className="text-sm text-comply-text-secondary">
                  No scans or gaps yet.{" "}
                  <span className="text-comply-text-tertiary">Run a full scan to populate your dashboard.</span>
                </li>
              ) : (
                recentActivity.map((a, i) => {
                  const Icon = activityIcons[a.icon] ?? IconScan;
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)] text-comply-green">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-comply-text-tertiary">
                          {a.time}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-comply-text-primary">{a.text}</p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Top gaps"
          action={
            <Link href="/gaps" className="comply-link inline-flex items-center gap-1 text-xs font-medium">
              View all <IconArrowRight size={14} />
            </Link>
          }
        />
        <CardBody className="p-0 pb-1">
          {topGaps.length === 0 ? (
            <div className="comply-empty border-0 bg-transparent">
              <p className="text-sm text-comply-text-secondary">
                {stats.recentScans?.some((s) => s.status === "COMPLETED")
                  ? "No open gaps in this list, great posture, or check Gaps for the full inventory."
                  : "No findings yet, connect a repository and run a scan to see your posture."}
              </p>
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Gap</th>
                  <th>Control</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topGaps.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <SeverityBadge severity={g.severity as Severity} />
                    </td>
                    <td>
                      <Link
                        href={`/gaps/${g.id}`}
                        className="font-medium text-comply-text-primary hover:text-comply-green"
                      >
                        {g.title}
                        {g.isSample ? <GapSampleBadge /> : null}
                      </Link>
                      {g.repoName && (
                        <p className="text-[10px] text-comply-text-tertiary">{g.repoName}</p>
                      )}
                    </td>
                    <td className="font-mono text-xs text-comply-green">{g.controlCode ?? "—"}</td>
                    <td className="text-comply-text-secondary">{formatGapSource(g.source)}</td>
                    <td className="text-comply-text-secondary">{formatGapStatus(g.status as Parameters<typeof formatGapStatus>[0])}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
