import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { GitConnectBanner } from "@/components/comply/git-connect-banner";
import { IntegrationsOAuthFeedback } from "@/components/integrations/integrations-oauth-feedback";
import { IntegrationsProviderGrid } from "@/components/integrations/integrations-provider-grid";
import { complianceApi } from "@/lib/compliance-api";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function resolveOrgSlug(): Promise<string | null> {
  if (!hasClerk) {
    return process.env.VIKELA_DEV_ORG_SLUG ?? "demo";
  }
  const session = await auth();
  return session.orgSlug ?? null;
}

export default async function IntegrationsPage() {
  let data;
  let repos;
  const orgSlug = await resolveOrgSlug();

  try {
    [data, repos] = await Promise.all([
      complianceApi.integrations(),
      complianceApi.repositories(),
    ]);
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Connections" title="Integrations" />
        <ApiError message={e instanceof Error ? e.message : "Failed to load integrations"} />
      </div>
    );
  }

  const connectedIds = data.providers.filter((p) => p.connected).map((p) => p.id);
  const repoSummary =
    repos.length > 0 ? repos.map((r) => r.fullName).join(" · ") : undefined;

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Connections"
        title="Integrations"
        description="GitHub, GitLab, Bitbucket, cloud providers, and identity—evidence from your whole stack."
      />

      <Suspense fallback={null}>
        <IntegrationsOAuthFeedback />
      </Suspense>

      <GitConnectBanner
        connectedProviders={connectedIds}
        repoSummary={repoSummary}
        orgSlug={orgSlug}
      />

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-comply-text-tertiary">
          All integrations
        </h2>
        <IntegrationsProviderGrid providers={data.providers} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
