import { Suspense } from "react";
import { CopilotWorkspace } from "@/components/copilot/CopilotWorkspace";
import { PlanUpgradePanel } from "@/components/billing/plan-upgrade-panel";
import { PageHeader } from "@/components/comply/page-header";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  let plan = "FREE";
  let allowed = true;
  try {
    const billing = await complianceApi.billing();
    plan = billing.plan;
    allowed = billing.features?.copilot ?? ["GROWTH", "ENTERPRISE"].includes(billing.plan);
  } catch {
    /* billing optional. API still enforces */
  }

  if (!allowed) {
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="AI"
          title="Vikela Copilot"
          description="Remediation guidance and answers grounded in your workspace."
        />
        <PlanUpgradePanel feature="copilot" currentPlan={plan} />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="comply-page">
          <p className="text-sm text-comply-text-secondary">Loading copilot…</p>
        </div>
      }
    >
      <CopilotWorkspace />
    </Suspense>
  );
}
