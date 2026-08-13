import Link from "next/link";
import { IconArrowLeft, IconRobot } from "@tabler/icons-react";
import { Card, CardBody } from "@/components/comply/card";
import { PageHeader } from "@/components/comply/page-header";
import { ControlStatusBadge } from "@/components/comply/status-badge";
import { SeverityBadge } from "@/components/comply/severity-badge";
import { mapControlStatus } from "@/lib/format";
import type { ControlStatus, Severity } from "@vikela/shared";

export type ControlDetail = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  guidance: string | null;
  status: string;
  frameworks: { slug: string; name: string; requirement?: string }[];
  gaps?: { id: string; title: string; severity: string; status: string }[];
  evidenceCount?: number;
  openGapCount?: number;
};

export function ControlDetailPageContent({ control }: { control: ControlDetail }) {
  const frameworks = control.frameworks ?? [];
  const gaps = control.gaps ?? [];

  return (
    <div className="comply-page max-w-3xl">
      <Link
        href="/controls"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-comply-text-secondary hover:text-comply-green-border"
      >
        <IconArrowLeft size={14} />
        Back to controls
      </Link>

      <PageHeader
        eyebrow={control.category}
        title={control.title}
        description={control.description}
        className="border-b-0 pb-2"
      >
        <span className="rounded-md border border-comply-green-border/40 bg-comply-green/15 px-3 py-1 font-mono text-sm font-semibold text-comply-green-border">
          {control.code}
        </span>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <ControlStatusBadge
          status={mapControlStatus(
            control.status as ControlStatus,
            (control.openGapCount ?? gaps.length) > 0
          )}
        />
        {control.evidenceCount != null && (
          <span className="text-xs text-comply-text-secondary">
            {control.evidenceCount} evidence file{control.evidenceCount === 1 ? "" : "s"}
          </span>
        )}
        {(control.openGapCount ?? gaps.length) > 0 && (
          <Link
            href={`/gaps?control=${encodeURIComponent(control.code)}`}
            className="text-xs font-medium text-comply-red hover:underline"
          >
            {control.openGapCount ?? gaps.length} open gap
            {(control.openGapCount ?? gaps.length) === 1 ? "" : "s"}
          </Link>
        )}
      </div>

      {control.guidance && (
        <div className="marketing-panel p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
            Auditor guidance
          </p>
          <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">{control.guidance}</p>
        </div>
      )}

      {frameworks.length > 0 && (
        <Card elevated>
          <CardBody>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Mapped frameworks
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {frameworks.map((m) => (
                <Link
                  key={m.slug}
                  href={`/controls?framework=${m.slug}`}
                  className="comply-badge border-comply-green-border/40 bg-comply-green/15 text-comply-green-border normal-case hover:border-comply-green-border"
                >
                  {m.name}
                  {m.requirement ? ` · ${m.requirement}` : ""}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {gaps.length > 0 && (
        <Card elevated>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Open gaps
              </h2>
              <Link
                href={`/gaps?control=${encodeURIComponent(control.code)}`}
                className="comply-link text-xs font-medium"
              >
                View all
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {gaps.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/gaps/${g.id}`}
                    className="min-w-0 text-sm font-medium text-comply-text-primary hover:text-comply-green-border"
                  >
                    {g.title}
                  </Link>
                  <SeverityBadge severity={g.severity as Severity} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Link
        href={`/copilot${gaps[0] ? `?gapId=${gaps[0].id}` : ""}`}
        className="comply-btn-primary inline-flex gap-2"
      >
        <IconRobot size={16} />
        Ask Copilot about this control
      </Link>
    </div>
  );
}
