import Link from "next/link";
import { ApiError } from "@/components/comply/api-error";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfidentialAuditBanner } from "@/components/trust/visibility-banners";
import { complianceApi } from "@/lib/compliance-api";
import { IconClipboardList } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  try {
    const { events } = await complianceApi.auditEvents();
    return (
      <div className="comply-page">
        <PageHeader
          eyebrow="Compliance"
          title="Audit trail"
          description="Private activity log for your organization — not shared on the public trust page."
        />
        <ConfidentialAuditBanner />
        <Card elevated>
          <CardHeader title="Recent activity" />
          <CardBody className="p-0 pb-1">
            {events.length === 0 ? (
              <EmptyState
                icon={IconClipboardList}
                title="No audit events yet"
                description="Connect integrations, invite teammates, or change settings to start building an activity trail."
                primaryAction={{ href: "/integrations", label: "Connect integrations" }}
                secondaryAction={{ href: "/help/getting-started", label: "Read getting started" }}
              />
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap text-comply-text-secondary">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="font-mono text-xs">{e.action}</td>
                      <td>
                        {e.actor?.name || e.actor?.email || (
                          <span className="text-comply-text-tertiary">System</span>
                        )}
                      </td>
                      <td className="max-w-[240px] truncate text-comply-text-secondary">
                        {e.target ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </CardBody>
        </Card>
        <p className="mt-4 text-xs text-comply-text-tertiary">
          Looking for scan history? See{" "}
          <Link href="/scans" className="text-comply-purple-border hover:underline">
            Scan history
          </Link>
          . Public customer page:{" "}
          <Link href="/trust" className="text-comply-purple-border hover:underline">
            Trust center
          </Link>
          .
        </p>
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
