import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { TeamPageContent } from "@/components/team/team-page";
import { complianceApi } from "@/lib/compliance-api";
import { mapMemberRow } from "@/lib/ui-mappers";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  try {
    const [members, billing] = await Promise.all([
      complianceApi.members(),
      complianceApi.billing(),
    ]);
    let pendingInvites: Awaited<ReturnType<typeof complianceApi.memberInvites>> = [];
    let canManageInvites = false;
    try {
      pendingInvites = await complianceApi.memberInvites();
      canManageInvites = true;
    } catch {
      /* non-admin: invites endpoint returns 403 */
    }
    return (
      <TeamPageContent
        members={members.map(mapMemberRow)}
        pendingInvites={pendingInvites}
        canManageInvites={canManageInvites}
        seats={{ used: billing.seats.used, included: billing.seats.limit }}
      />
    );
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Admin" title="Team & access" description="Manage workspace members." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load team"} />
      </div>
    );
  }
}
