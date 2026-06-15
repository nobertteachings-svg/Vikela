import { ApiError } from "@/components/comply/api-error";
import { ControlsPageContent } from "@/components/controls/controls-page";
import { PageHeader } from "@/components/comply/page-header";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function ControlsPage({
  searchParams,
}: {
  searchParams?: { framework?: string };
}) {
  try {
    const { controls, frameworks, org } = await complianceApi.controlsPage();
    return (
      <ControlsPageContent
        controls={controls}
        frameworks={frameworks}
        org={org}
        initialFramework={searchParams?.framework}
      />
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Compliance" title="Controls" />
        <ApiError
          message={
            e instanceof Error
              ? `${e.message} — ensure the API is running and the database is seeded.`
              : "Failed to load controls"
          }
        />
      </div>
    );
  }
}
