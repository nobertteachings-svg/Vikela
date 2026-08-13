import { ApiError } from "@/components/comply/api-error";
import { PlanUpgradePanel } from "@/components/billing/plan-upgrade-panel";
import { PageHeader } from "@/components/comply/page-header";
import { PoliciesClient } from "./policies-client";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  try {
    const [policies, billing] = await Promise.all([
      complianceApi.policies(),
      complianceApi.billing().catch(() => null),
    ]);
    const canGenerate =
      billing?.features?.policyGenerator ??
      (billing ? ["GROWTH", "ENTERPRISE"].includes(billing.plan) : true);

    if (billing && !canGenerate && policies.length === 0) {
      return (
        <div className="comply-page">
          <PageHeader
            eyebrow="Program"
            title="Policies"
            description="Generate and maintain auditor-ready policy drafts from your gaps."
          />
          <PlanUpgradePanel feature="policy_generator" currentPlan={billing.plan} />
        </div>
      );
    }

    return <PoliciesClient initialPolicies={policies} canGenerate={canGenerate} />;
  } catch (e) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold text-comply-text-primary">Policies</h1>
        <ApiError message={e instanceof Error ? e.message : "Failed to load policies"} />
      </div>
    );
  }
}
