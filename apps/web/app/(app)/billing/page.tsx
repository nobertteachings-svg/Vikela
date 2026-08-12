import { Suspense } from "react";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { BillingPageContent } from "@/components/billing/billing-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  try {
    const billing = await complianceApi.billing();
    return (
      <Suspense fallback={null}>
        <BillingPageContent subscription={billing} />
      </Suspense>
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Admin" title="Billing" description="Plan and usage." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load billing"} />
      </div>
    );
  }
}
