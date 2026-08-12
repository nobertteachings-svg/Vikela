import { ApiError } from "@/components/comply/api-error";
import { TrustAdminPanel, type TrustAdminData } from "@/components/trust/trust-admin-panel";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function TrustCenterPage() {
  try {
    const data = await complianceApi.trust();
    const admin: TrustAdminData = {
      name: data.name,
      slug: data.slug,
      tagline: data.tagline,
      updatedAt: data.updatedAt,
      shareUrl: data.shareUrl,
      frameworks: data.frameworks,
      policies: data.policies,
      settings: data.settings,
      recentRequests: data.recentRequests as TrustAdminData["recentRequests"],
    };
    return <TrustAdminPanel initial={admin} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <ApiError message={e instanceof Error ? e.message : "Failed to load trust center"} />
      </div>
    );
  }
}
