import Link from "next/link";
import { Suspense } from "react";
import { IconPhoto, IconFile, IconDatabase } from "@tabler/icons-react";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { AuditPeriodToolbar } from "@/components/evidence/audit-period-toolbar";
import { CollectFromGapsButton } from "@/components/evidence/collect-from-gaps-button";
import { EvidenceCoverageWidget } from "@/components/evidence/evidence-coverage-widget";
import { EvidenceUpload } from "@/components/evidence/evidence-upload";
import { complianceApi } from "@/lib/compliance-api";

const typeIcons: Record<string, typeof IconPhoto> = {
  SCREENSHOT: IconPhoto,
  LOG: IconDatabase,
  EXPORT: IconDatabase,
  POLICY: IconFile,
  CONFIG: IconFile,
  OTHER: IconFile,
};

function formatType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ");
}

export default async function EvidencePage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const period = {
    from: searchParams?.from,
    to: searchParams?.to,
  };
  const hasPeriod = Boolean(period.from || period.to);

  let items;
  let coverage;
  let dashboard;
  try {
    [items, coverage, dashboard] = await Promise.all([
      complianceApi.evidence(period),
      complianceApi.evidenceCoverage(hasPeriod ? period : undefined),
      complianceApi.dashboard(),
    ]);
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader title="Evidence locker" />
        <ApiError message={e instanceof Error ? e.message : "Failed to load evidence"} />
      </div>
    );
  }

  const openGaps =
    (dashboard.gapsBySeverity?.CRITICAL ?? 0) +
    (dashboard.gapsBySeverity?.HIGH ?? 0) +
    (dashboard.gapsBySeverity?.MEDIUM ?? 0) +
    (dashboard.gapsBySeverity?.LOW ?? 0) +
    (dashboard.gapsBySeverity?.INFO ?? 0);

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Audit"
        title="Evidence locker"
        description="Screenshots, exports, and documents linked to controls for your audit."
      >
        <CollectFromGapsButton
          openGaps={openGaps}
          hasSampleGaps={dashboard.hasSampleGaps ?? false}
          variant="secondary"
          className="items-end"
        />
      </PageHeader>

      <Suspense fallback={null}>
        <AuditPeriodToolbar className="mb-2" />
      </Suspense>

      {dashboard.hasSampleGaps && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Sample findings from onboarding can&apos;t be collected as audit evidence.{" "}
          <Link href="/integrations" className="font-medium underline underline-offset-2">
            Connect a repo
          </Link>{" "}
          and run a full scan for real evidence.
        </div>
      )}

      <EvidenceCoverageWidget
        controlsWithEvidence={coverage.controlsWithEvidence}
        totalControls={coverage.totalControls}
        periodLabel={hasPeriod ? "period" : "all"}
      />

      <Card elevated className="border-dashed border-comply-purple-border/35">
        <CardBody className="flex flex-col items-center py-10 text-center">
          <p className="text-sm text-comply-text-secondary">
            Upload PDFs, images, or exports linked to your audit.
          </p>
          <EvidenceUpload />
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="comply-empty col-span-full">
            <p className="text-sm text-comply-text-secondary">
              No evidence in this period. Adjust the date range or collect from open gaps after a scan.
            </p>
          </div>
        ) : (
          items.map((e) => {
            const Icon = typeIcons[e.type] ?? IconFile;
            const autoCollected = e.isAutoCollected ?? e.source.startsWith("AUTO_");
            return (
              <Card key={e.id} className="transition-transform hover:-translate-y-0.5">
                <CardBody>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-comply-purple/15 text-comply-purple-border">
                    <Icon size={20} />
                  </span>
                  <p className="mt-4 truncate font-medium text-comply-text-primary">{e.title}</p>
                  {e.controlCode && (
                    <Link
                      href={`/controls/${encodeURIComponent(e.controlCode)}`}
                      className="comply-link mt-1 inline-block font-mono text-xs"
                    >
                      {e.controlCode}
                    </Link>
                  )}
                  <p className="mt-2 text-xs text-comply-text-secondary">
                    {formatType(e.type)} · {new Date(e.collectedAt).toLocaleDateString()}
                  </p>
                  <span className="comply-badge mt-3 border-comply-green/30 bg-comply-green/10 text-comply-green normal-case">
                    {autoCollected ? "Auto-collected" : "Uploaded"}
                  </span>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
