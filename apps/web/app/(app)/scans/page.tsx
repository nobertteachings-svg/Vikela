import { ScansClient } from "./scans-client";
import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { complianceApi } from "@/lib/compliance-api";

export default async function ScansPage() {
  let scans;
  let dashboard;
  try {
    [scans, dashboard] = await Promise.all([complianceApi.scans(), complianceApi.dashboard()]);
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Monitoring" title="Scan history" />
        <ApiError message={e instanceof Error ? e.message : "Failed to load scans"} />
      </div>
    );
  }

  const trend = dashboard.scoreTrend.map((p) => ({
    week: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: p.score,
  }));

  return <ScansClient scans={scans} trend={trend} />;
}
