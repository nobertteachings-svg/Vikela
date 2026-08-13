import Link from "next/link";
import { IconRobot } from "@tabler/icons-react";
import { SeverityBadge } from "@/components/comply/severity-badge";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { complianceApi } from "@/lib/compliance-api";
import type { Severity } from "@vikela/shared";

export default async function RemediationPage() {
  let gaps;
  try {
    gaps = await complianceApi.gaps({ status: "OPEN" });
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader
          title="Gap remediation"
          description="Actionable steps attached to open critical and high gaps. Open Copilot for deeper guidance."
        />
        <ApiError message={e instanceof Error ? e.message : "Failed to load gaps"} />
      </div>
    );
  }

  const plans = gaps
    .filter((g) => g.severity === "CRITICAL" || g.severity === "HIGH")
    .map((g) => ({
      ...g,
      steps: g.remediation
        .split(/\n+/)
        .map((s) => s.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean),
    }));

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Findings"
        title="Gap remediation"
        description="Actionable steps attached to open critical and high gaps. Open Copilot for deeper guidance."
      />

      {plans.length === 0 ? (
        <div className="comply-empty">
          <p className="text-sm font-medium text-comply-text-primary">No gap remediation steps yet</p>
          <p className="mt-1 max-w-sm text-sm text-comply-text-secondary">
            Open critical and high gaps that include a remediation field will list those steps here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} elevated>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug text-comply-text-primary">{plan.title}</h2>
                  <SeverityBadge severity={plan.severity as Severity} />
                </div>
                <ol className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-5">
                  {plan.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-comply-text-secondary">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-comply-elevated font-mono text-xs font-semibold text-comply-purple-border">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={`/copilot?gapId=${plan.id}`}
                  className="comply-btn-primary mt-5 inline-flex text-xs"
                >
                  <IconRobot size={16} />
                  Open in Copilot
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
