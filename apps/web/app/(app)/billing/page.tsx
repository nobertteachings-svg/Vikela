import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { BillingPageContent } from "@/components/billing/billing-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  try {
    const billing = await complianceApi.billing();
    return <BillingPageContent subscription={billing} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Admin" title="Billing" description="Plan and usage." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load billing"} />
      </div>
    );
  }
}
