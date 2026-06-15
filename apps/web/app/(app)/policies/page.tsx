import { ApiError } from "@/components/comply/api-error";
import { PoliciesClient } from "./policies-client";
import { complianceApi } from "@/lib/compliance-api";

export default async function PoliciesPage() {
  try {
    const policies = await complianceApi.policies();
    return <PoliciesClient initialPolicies={policies} />;
  } catch (e) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-xl font-semibold text-comply-text-primary">Policies</h1>
        <ApiError message={e instanceof Error ? e.message : "Failed to load policies"} />
      </div>
    );
  }
}
