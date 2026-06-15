import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { SettingsPageContent } from "@/components/settings/settings-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  try {
    const [org, settings] = await Promise.all([
      complianceApi.org(),
      complianceApi.settings(),
    ]);
    return <SettingsPageContent org={org} settings={settings} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Admin" title="Settings" description="Organization settings." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load settings"} />
      </div>
    );
  }
}
