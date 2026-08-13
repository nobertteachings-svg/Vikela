import { Card, CardBody } from "@/components/comply/card";
import { CoverageArc } from "@/components/evidence/coverage-arc";

type EvidenceCoverageWidgetProps = {
  controlsWithEvidence: number;
  totalControls: number;
  periodLabel?: "period" | "all";
};

export function EvidenceCoverageWidget({
  controlsWithEvidence,
  totalControls,
  periodLabel = "all",
}: EvidenceCoverageWidgetProps) {
  const scopeSubtitle =
    periodLabel === "period" ? "In selected audit period" : "All time";

  return (
    <Card elevated>
      <CardBody className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="max-w-md text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
            Control coverage
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-comply-muted">{scopeSubtitle}</p>
          <h2 className="mt-2 text-lg font-medium text-comply-text-primary">
            Evidence linked to your control library
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
            A control is <strong className="font-medium text-comply-text-primary">covered</strong> when
            at least one evidence record is linked to it, scan exports, policies, screenshots, or
            uploads.
          </p>
          <p className="mt-3 font-mono text-sm text-comply-text-primary">
            {controlsWithEvidence} of {totalControls} controls covered
          </p>
        </div>
        <CoverageArc covered={controlsWithEvidence} total={totalControls} />
      </CardBody>
    </Card>
  );
}
