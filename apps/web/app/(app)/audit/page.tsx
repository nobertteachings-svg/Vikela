import { ApiError } from "@/components/comply/api-error";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { complianceApi } from "@/lib/compliance-api";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  try {
    const scans = await complianceApi.scans();
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="Compliance"
          title="Audit trail"
          description="Scan history and compliance activity for your organization."
        />
        <Card elevated>
          <CardHeader title="Recent scans" />
          <CardBody className="p-0 pb-1">
            <DataTable>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Gaps</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-comply-text-secondary">
                      No scans yet. Connect integrations and run a scan from the dashboard.
                    </td>
                  </tr>
                ) : (
                  scans.map((s) => (
                    <tr key={s.id}>
                      <td>{s.scanType}</td>
                      <td>{s.target ?? "—"}</td>
                      <td>{s.status}</td>
                      <td>{s.score ?? "—"}</td>
                      <td>{s.gapsFound}</td>
                      <td>
                        {s.completedAt
                          ? new Date(s.completedAt).toLocaleString()
                          : new Date(s.startedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </CardBody>
        </Card>
      </div>
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Compliance" title="Audit trail" description="Activity log." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load audit trail"} />
      </div>
    );
  }
}
