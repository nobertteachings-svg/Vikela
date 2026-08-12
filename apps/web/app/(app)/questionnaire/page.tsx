import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { QuestionnairePageContent } from "@/components/questionnaire/questionnaire-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams?: { vendorId?: string; qid?: string };
}) {
  const vendorId = searchParams?.vendorId;
  try {
    const list = await complianceApi.questionnaires(vendorId);
    const byQid = searchParams?.qid
      ? list.find((q) => q.id === searchParams.qid) ?? null
      : null;
    const active = byQid ?? list[0] ?? null;
    const vendorName =
      active?.title?.replace(/\s+security questionnaire$/i, "") ??
      (vendorId ? "Vendor" : null);

    return (
      <QuestionnairePageContent
        initial={active}
        list={list}
        vendorId={vendorId ?? null}
        vendorName={vendorName}
      />
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="Audit"
          title="Security questionnaire"
          description="Review and complete vendor security questionnaire answers."
        />
        <ApiError message={e instanceof Error ? e.message : "Failed to load questionnaire"} />
      </div>
    );
  }
}
