import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { DashboardPageContent } from "@/components/dashboard/dashboard-page";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const { stats, frameworks, gaps, org, evidenceCoverage } = await complianceApi.dashboardPage();
    return (
      <DashboardPageContent
        stats={stats}
        frameworks={frameworks}
        topGaps={gaps.slice(0, 10)}
        org={org}
        evidenceCoverage={evidenceCoverage}
      />
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="One platform for every framework, mapped from code, cloud, and identity."
        />
        <ApiError
          message={
            e instanceof Error
              ? e.message.includes("Organization not found") ||
                  e.message.includes("No organization found")
                ? `${e.message}. API is up but your Clerk org is not in Vikela yet. Restart dev after .env sync, or run: npm run db:seed. For a new Clerk org, forward webhooks (clerk webhook) or open /onboarding.`
                : `${e.message}, ensure the API is running (npm run dev) and the database is seeded (npm run db:seed).`
              : "Failed to load dashboard"
          }
        />
      </div>
    );
  }
}
