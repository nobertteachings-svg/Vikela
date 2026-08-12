import { Suspense } from "react";
import Link from "next/link";
import { SeverityBadge } from "@/components/comply/severity-badge";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { SummaryChip } from "@/components/comply/summary-chip";
import { AuditPeriodToolbar } from "@/components/evidence/audit-period-toolbar";
import { CollectFromGapsButton } from "@/components/evidence/collect-from-gaps-button";
import { GapSampleBadge } from "@/components/gaps/gap-sample-badge";
import { GapsListToolbar } from "@/components/gaps/gaps-list-toolbar";
import { complianceApi } from "@/lib/compliance-api";
import {
  formatFilePath,
  formatGapStatus,
  formatResolvedAt,
  gapsListEmptyState,
  severityCountsFromGaps,
  sumSeverities,
} from "@/lib/format";
import type { GapListStatus } from "@/lib/format";
import type { Severity } from "@vikela/shared";

export default async function GapsPage({
  searchParams,
}: {
  searchParams?: {
    from?: string;
    to?: string;
    framework?: string;
    control?: string;
    severity?: string;
    source?: string;
    status?: string;
    scanId?: string;
  };
}) {
  const period = {
    from: searchParams?.from,
    to: searchParams?.to,
  };
  const frameworkSlug = searchParams?.framework;
  const controlCode = searchParams?.control;
  const severity = searchParams?.severity;
  const source = searchParams?.source;
  const scanId = searchParams?.scanId;
  const listStatus: GapListStatus =
    searchParams?.status === "RESOLVED" ? "RESOLVED" : "OPEN";
  const isResolved = listStatus === "RESOLVED";

  const hasFilters = Boolean(severity || source || frameworkSlug || controlCode || scanId);

  let gaps;
  let dashboard;
  let frameworkName: string | null = null;
  try {
    if (frameworkSlug) {
      const frameworks = await complianceApi.frameworks();
      frameworkName = frameworks.find((f) => f.slug === frameworkSlug)?.name ?? frameworkSlug;
    }
    [gaps, dashboard] = await Promise.all([
      complianceApi.gaps({
        status: listStatus,
        severity,
        source,
        framework: frameworkSlug,
        control: controlCode,
        scanId,
        ...period,
      }),
      complianceApi.dashboard(),
    ]);
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader title="Gaps & findings" />
        <ApiError message={e instanceof Error ? e.message : "Failed to load gaps"} />
      </div>
    );
  }

  const summary = severityCountsFromGaps(gaps);
  const openGaps = sumSeverities(summary);
  const empty = gapsListEmptyState({ status: listStatus, hasFilters });

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Findings"
        title="Gaps & findings"
        description={
          isResolved
            ? "Gaps marked resolved — track closure over your audit period."
            : scanId
              ? "Gaps from this scan run."
              : controlCode
                ? `Open gaps mapped to control ${controlCode}.`
                : frameworkName
                  ? `Open gaps mapped to ${frameworkName}. Unmapped findings are not shown.`
                  : "Security and compliance issues detected across code, cloud, and identity."
        }
      >
        {!isResolved && openGaps > 0 && (
          <CollectFromGapsButton
            openGaps={openGaps}
            hasSampleGaps={dashboard.hasSampleGaps ?? false}
            variant="secondary"
            className="items-end"
          />
        )}
      </PageHeader>

      <Suspense fallback={null}>
        <AuditPeriodToolbar className="mb-4" />
      </Suspense>

      <Suspense fallback={null}>
        <GapsListToolbar className="mb-4" />
      </Suspense>

      {!isResolved && (
        <div className="mb-4 flex flex-wrap gap-3">
          <SummaryChip label="Critical" value={summary.CRITICAL} tone="red" />
          <SummaryChip label="High" value={summary.HIGH} tone="amber" />
          <SummaryChip label="Medium" value={summary.MEDIUM} tone="muted" />
        </div>
      )}

      <Card elevated>
        <CardBody className="p-0 pb-1">
          {gaps.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-comply-text-primary">{empty.title}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-comply-text-secondary">{empty.body}</p>
              {!isResolved && !hasFilters ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/integrations"
                    className="rounded-lg bg-comply-purple px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Connect integrations
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-comply-text-secondary hover:bg-white/[0.04]"
                  >
                    Run a scan
                  </Link>
                  <Link
                    href="/help/getting-started"
                    className="text-sm text-comply-purple-border hover:underline"
                  >
                    Getting started guide
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Finding</th>
                  <th>Repository</th>
                  <th>File</th>
                  <th>Control</th>
                  {!isResolved && <th>Status</th>}
                  {isResolved && <th>Resolved</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <SeverityBadge severity={g.severity as Severity} />
                    </td>
                    <td>
                      <span className="font-medium">{g.title}</span>
                      {g.isSample ? <GapSampleBadge /> : null}
                    </td>
                    <td className="font-mono text-xs text-comply-text-secondary">{g.repoName ?? "—"}</td>
                    <td className="font-mono text-xs text-comply-text-tertiary">
                      {formatFilePath(g.filePath, g.lineNumber)}
                    </td>
                    <td className="font-mono text-xs text-comply-purple-border">{g.controlCode ?? "—"}</td>
                    {!isResolved && (
                      <td className="text-comply-text-secondary">
                        {formatGapStatus(g.status as never)}
                      </td>
                    )}
                    {isResolved && (
                      <td className="text-xs text-comply-text-secondary">
                        {formatResolvedAt(g.resolvedAt)}
                      </td>
                    )}
                    <td>
                      <Link href={`/gaps/${g.id}`} className="comply-link text-xs font-medium">
                        View
                      </Link>
                    </td>
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
