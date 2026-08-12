import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { TrainingPageContent } from "@/components/training/training-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export type TrainingModuleProp = {
  id: string;
  name: string;
  description: string;
  framework: string | null;
  completed: number;
  total: number;
  due: string | null;
  duration: string;
  durationMin?: number;
  contentKey?: string | null;
  hasCourse?: boolean;
  lessonCount?: number;
  status: string;
};

export default async function TrainingPage() {
  try {
    const [modules, progress, mine] = await Promise.all([
      complianceApi.training(),
      complianceApi.trainingProgress(),
      complianceApi.trainingMine(),
    ]);
    return (
      <TrainingPageContent
        modules={modules}
        progress={progress.members}
        currentMemberId={progress.currentMemberId}
        mine={mine}
      />
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="People" title="Training" description="Security awareness modules." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load training"} />
      </div>
    );
  }
}
