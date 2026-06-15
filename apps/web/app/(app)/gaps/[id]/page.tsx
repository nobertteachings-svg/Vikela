import Link from "next/link";
import { notFound } from "next/navigation";
import { IconRobot, IconArrowLeft } from "@tabler/icons-react";
import { GapStatusActions } from "@/components/gaps/gap-status-actions";
import { SeverityBadge } from "@/components/comply/severity-badge";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { complianceApi } from "@/lib/compliance-api";
import { formatFilePath } from "@/lib/format";
import type { GapStatus, Severity } from "@vikela/shared";

export default async function GapDetailPage({ params }: { params: { id: string } }) {
  let gap;
  try {
    gap = await complianceApi.gap(params.id);
  } catch {
    notFound();
  }

  const fixSteps = gap.remediation
    .split(/\n+/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return (
    <div className="comply-page max-w-3xl">
      <Link
        href="/gaps"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-comply-text-secondary hover:text-comply-purple-border"
      >
        <IconArrowLeft size={14} />
        Back to gaps
      </Link>

      <PageHeader eyebrow="Findings" title={gap.title} className="border-b-0 pb-2">
        <SeverityBadge severity={gap.severity as Severity} />
        <GapStatusActions gapId={gap.id} status={gap.status as GapStatus} />
      </PageHeader>

      <Card>
        <CardBody className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
              What this means
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">{gap.description}</p>
          </section>

          {fixSteps.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                How to fix it
              </h2>
              <ol className="mt-3 space-y-2.5">
                {fixSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-comply-text-secondary">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-comply-elevated font-mono text-xs font-semibold text-comply-purple-border">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {gap.filePath && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Affected files
              </h2>
              <code className="mt-2 inline-block rounded-md border border-[var(--border)] bg-comply-primary px-3 py-1.5 font-mono text-xs text-comply-purple-border">
                {formatFilePath(gap.filePath, gap.lineNumber)}
              </code>
            </section>
          )}

          {gap.controlCode && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Mapped control
              </h2>
              <Link
                href={`/controls/${gap.controlCode}`}
                className="comply-link mt-2 inline-block font-mono text-sm"
              >
                {gap.controlCode}
                {gap.controlTitle ? ` — ${gap.controlTitle}` : ""}
              </Link>
            </section>
          )}

          <Link href={`/copilot?gapId=${gap.id}`} className="comply-btn-primary inline-flex">
            <IconRobot size={16} />
            Ask Copilot to fix this
          </Link>
        </CardBody>
      </Card>

      <p className="text-xs text-comply-text-tertiary">
        Detected {new Date(gap.createdAt).toLocaleString()} · Source: {gap.source}
      </p>
    </div>
  );
}
