import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { GitConnectBanner } from "@/components/comply/git-connect-banner";
import { IntegrationsOAuthFeedback } from "@/components/integrations/integrations-oauth-feedback";
import { IntegrationsProviderGrid } from "@/components/integrations/integrations-provider-grid";
import { complianceApi } from "@/lib/compliance-api";
import { resolveDevOrgSlug } from "@/lib/dev-org-slug";
import { serverApiPost } from "@/lib/server-api";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type EnsureMembershipResult = {
  orgReady?: boolean;
  memberReady?: boolean;
  orgSlug?: string;
};

/** Prefer Vikela DB slug (may differ from Clerk slug after provision suffix). */
async function resolveVikelaOrgSlug(): Promise<string | null> {
  if (!hasClerk) {
    return resolveDevOrgSlug() ?? null;
  }

  try {
    const ensured = await serverApiPost<EnsureMembershipResult>(
      "/api/v1/onboarding/ensure-membership"
    );
    if (ensured.orgSlug) return ensured.orgSlug;
  } catch {
    // Fall through to /org or Clerk slug
  }

  try {
    const org = await complianceApi.org();
    if (org.slug) return org.slug;
  } catch {
    // Fall through
  }

  const session = await auth();
  return session.orgSlug ?? null;
}

export default async function IntegrationsPage() {
  let data;
  let repos;
  let orgSlug: string | null = null;

  try {
    orgSlug = await resolveVikelaOrgSlug();
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
        description="Connect Git, cloud, identity, observability, and chat. Need API keys or AssumeRole steps? Open Help → Integrations."
      >
        <a
          href="/help/integrations"
          className="comply-btn-ghost text-sm"
        >
          Integration how-tos
        </a>
      </PageHeader>

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
