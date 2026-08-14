import Link from "next/link";
import {
  IconAlertTriangle,
  IconBrandAws,
  IconCircleCheck,
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
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
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
      text: `${SCAN_TYPE_LABEL[scan.scanType]}${scan.target ? ` — ${scan.target}` : ""} · ${scan.gapsFound} gaps${scan.score != null ? ` · score ${scan.score}` : ""}`,
    });
  }

  for (const gap of topGaps.slice(0, 3)) {
    items.push({
      time: timeAgo(gap.createdAt),
      icon: "alert",
      text: `${gap.severity} gap — ${gap.title}${gap.filePath ? ` in ${gap.filePath}` : ""}`,
    });
  }

  if ((stats.scoreTrend ?? []).length > 0 && items.length < 5) {
    const last = stats.scoreTrend[stats.scoreTrend.length - 1];
    items.unshift({
      time: "Latest",
      icon: "document",
      text: `Posture score ${last.score} — ${new Date(last.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
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
        description="One platform for every framework your customers ask for—mapped from code, cloud, and identity."
      >
        <FullScanButton />
      </PageHeader>

      {stats.hasSampleGaps && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <strong>Sample preview active.</strong> Some findings below are labeled examples from your
          onboarding scan
          {stats.liteScanSource === "mixed" ? " (mixed with real results)" : ""}. Run a full scan or
          connect cloud for live posture data.
        </div>
      )}

      {/* Product hero — live API data */}
      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-comply-purple/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/4 h-32 w-64 rounded-full bg-comply-green/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <SectionLabel>Universal Compliance Engine</SectionLabel>
            <h2 className="mt-3 max-w-2xl bg-gradient-to-br from-[#faf9f5] via-[#d8d6ce] to-[#888780] bg-clip-text text-2xl font-medium leading-tight tracking-tight text-transparent sm:text-3xl">
              One platform for every framework your customers ask for
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
              Shieldoq maps findings from code, cloud, and identity into{" "}
              {enrolledFrameworks.length > 0
                ? enrolledFrameworks.map((f) => f.name).join(", ")
                : "SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and more"}
              —so you run one program, not ten spreadsheets.
            </p>
            <p className="mt-2 text-xs text-comply-text-tertiary">
              Workspace: <span className="font-medium text-comply-text-secondary">{org.name}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {enrolledFrameworks.length === 0 ? (
                <span className="text-xs text-comply-text-tertiary">
                  Enable frameworks below to start mapping controls
                </span>
              ) : (
                enrolledFrameworks.map((fw) => (
                  <Link
                    key={fw.id}
                    href="/frameworks"
                    className={cn(
                      "rounded-sm border px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm transition-colors hover:border-comply-purple-border/50",
                      fw.score > 0 || fw.status !== "NOT_STARTED"
                        ? "border-comply-purple-border/50 bg-comply-purple/15 text-comply-purple-light"
                        : "border-white/[0.08] bg-white/[0.04] text-comply-text-secondary"
                    )}
                  >
                    {fw.name}
                    {fw.score > 0 ? ` · ${fw.score}%` : ""}
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:min-w-[200px]">
            <div className="rounded-md border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Posture score
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold text-comply-purple">
                {stats.postureScore}
              </p>
            </div>
            <ul className="space-y-2 text-xs text-comply-text-secondary">
              <li className="flex gap-2">
                <IconCircleCheck size={14} className="shrink-0 text-comply-green" stroke={2} />
                {stats.connectedIntegrations} integrations connected
              </li>
              <li className="flex gap-2">
                <IconCircleCheck size={14} className="shrink-0 text-comply-green" stroke={2} />
                {openGaps} open gaps across your stack
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-4 text-xs text-comply-text-secondary">
          <span>
            <span className="font-mono font-medium text-comply-text-primary">
              {evidenceCoverage.controlsWithEvidence}/{evidenceCoverage.totalControls}
            </span>{" "}
            controls covered
          </span>
          <span className="text-comply-text-tertiary" aria-hidden>
            ·
          </span>
          <span>
            <span className="font-mono font-medium text-comply-text-primary">{openGaps}</span> gaps open
          </span>
          {lastScanAt && (
            <>
              <span className="text-comply-text-tertiary" aria-hidden>
                ·
              </span>
              <span>Last scan {timeAgo(lastScanAt)}</span>
            </>
          )}
        </div>
      </div>

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

      {/* Findings by stack — from API gapsBySource */}
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
                className="marketing-panel group flex items-center gap-4 p-5 transition-all hover:border-comply-purple-border/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border">
                  <Icon size={22} stroke={1.5} />
                </span>
                <div>
                  <p className="text-sm font-medium text-comply-text-primary group-hover:text-comply-purple-border">
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
          <Card elevated>
            <CardBody className="flex justify-center py-6">
              <PostureArc score={stats.postureScore} />
            </CardBody>
          </Card>
          <DashboardFrameworkPicker frameworks={frameworks} lastScanAt={lastScanAt} />

          {stats.cloudAccounts.length > 0 && (
            <Card>
              <CardHeader title="Cloud accounts" />
              <CardBody className="space-y-3">
                {stats.cloudAccounts.map((ca) => (
                  <div
                    key={ca.id}
                    className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <IconBrandAws size={18} className="text-comply-purple-border" />
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
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-comply-elevated text-comply-purple-border">
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
                  ? "No open gaps in this list — great posture, or check Gaps for the full inventory."
                  : "No findings yet — connect a repository and run a scan to see your posture."}
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
                        className="font-medium text-comply-text-primary hover:text-comply-purple-border"
                      >
                        {g.title}
                        {g.isSample ? <GapSampleBadge /> : null}
                      </Link>
                      {g.repoName && (
                        <p className="text-[10px] text-comply-text-tertiary">{g.repoName}</p>
                      )}
                    </td>
                    <td className="font-mono text-xs text-comply-purple-border">{g.controlCode ?? "—"}</td>
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
