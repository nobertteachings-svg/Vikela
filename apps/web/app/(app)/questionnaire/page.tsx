import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { QuestionnairePageContent } from "@/components/questionnaire/questionnaire-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  try {
    const list = await complianceApi.questionnaires();
    const active = list[0] ?? null;
    return <QuestionnairePageContent initial={active} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="Audit"
          title="Security questionnaire"
          description="Upload vendor questionnaires and review AI-suggested answers."
        />
        <ApiError message={e instanceof Error ? e.message : "Failed to load questionnaire"} />
      </div>
    );
  }
}
