import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { RisksPageContent } from "@/components/risks/risks-page";
import { complianceApi } from "@/lib/compliance-api";
import { mapRiskRow } from "@/lib/ui-mappers";

export const dynamic = "force-dynamic";

export default async function RisksPage() {
  try {
    const risks = await complianceApi.risks();
    return <RisksPageContent risks={risks.map(mapRiskRow)} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Compliance" title="Risk register" description="Track and mitigate organizational risks." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load risks"} />
      </div>
    );
  }
}
