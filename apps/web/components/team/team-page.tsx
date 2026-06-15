"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconMail, IconShieldCheck, IconUser } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { teamRoles, type TeamRole } from "@/lib/mock-data";
import type { PendingInviteRow } from "@/lib/compliance-api";
import { apiPost } from "@/lib/api";
import type { UiTeamMember } from "@/lib/ui-mappers";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const ROLE_STYLES: Record<TeamRole, string> = {
  Admin: "border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border",
  Member: "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary",
  Auditor: "border-comply-green/30 bg-comply-green/10 text-comply-green",
};

const INVITE_ROLES = ["Member", "Admin", "Auditor"] as const;

function formatInviteRole(role: string): TeamRole {
  const normalized = role.toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "auditor") return "Auditor";
  return "Member";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamPageContent({
  members: teamMembers,
  pendingInvites,
  canManageInvites,
  seats,
}: {
  members: UiTeamMember[];
  pendingInvites: PendingInviteRow[];
  canManageInvites: boolean;
  seats: { used: number; included: number };
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof INVITE_ROLES)[number]>("Member");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const mfaCount = teamMembers.filter((m) => m.mfa).length;

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMessage(null);
    setInviteError(null);
    try {
      await apiPost("/api/v1/members/invite", {
        email: inviteEmail.trim(),
        role: inviteRole.toUpperCase(),
      });
      setInviteMessage(`Invitation sent to ${inviteEmail.trim()}. They'll receive an email from Clerk.`);
      setInviteEmail("");
      router.refresh();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Admin"
        title="Team & access"
        description="Manage workspace members, roles, MFA enrollment, and pending invitations."
      />

      <p className="text-sm text-comply-text-secondary">
        {teamMembers.length} members · {seats.used}/{seats.included} seats used
      </p>

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <p className="relative text-sm leading-relaxed text-comply-text-secondary">
          Invitations are sent through Clerk with the selected organization role. Auditors receive
          read-only access once they accept.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={String(teamMembers.length)} accent="purple" />
        <StatCard label="MFA enrolled" value={`${mfaCount}/${teamMembers.length}`} accent="green" />
        <StatCard label="Admins" value={String(teamMembers.filter((m) => m.role === "Admin").length)} accent="amber" />
        <StatCard label="Auditors" value={String(teamMembers.filter((m) => m.role === "Auditor").length)} accent="purple" hint="external" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card elevated>
          <CardHeader title="Members" />
          <CardBody className="p-0 pb-1">
            <DataTable>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>MFA</th>
                  <th>Last active</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-comply-purple-border/30 bg-comply-purple/15 text-[10px] font-semibold text-comply-purple-border">
                          {initials(m.name)}
                        </span>
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-comply-text-tertiary">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-comply-text-secondary">{m.department}</td>
                    <td>
                      <span className={cn("comply-badge normal-case", ROLE_STYLES[m.role])}>
                        {m.role}
                      </span>
                    </td>
                    <td>
                      {m.mfa ? (
                        <span className="inline-flex items-center gap-1 text-xs text-comply-green">
                          <IconShieldCheck size={14} />
                          On
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-comply-red">Required</span>
                      )}
                    </td>
                    <td className="text-comply-text-secondary">{m.lastActive}</td>
                    <td className="text-comply-text-secondary">
                      {new Date(m.joined).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {canManageInvites ? (
          <Card elevated>
            <CardHeader title="Invite member" />
            <CardBody className="space-y-3">
              <label className="block text-sm">
                <span className="text-comply-text-secondary">Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@acme.io"
                  className="comply-input mt-1.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-comply-text-secondary">Role</span>
                <select
                  className="comply-input mt-1.5"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as (typeof INVITE_ROLES)[number])}
                >
                  {INVITE_ROLES.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
              <ComplyButton
                variant="primary"
                className="w-full gap-1.5 text-sm"
                disabled={inviting || !inviteEmail.trim()}
                onClick={sendInvite}
              >
                <IconMail size={16} />
                {inviting ? "Sending…" : "Send invite"}
              </ComplyButton>
              {inviteMessage && (
                <p className="rounded-md border border-comply-green/30 bg-comply-green/10 px-3 py-2 text-xs text-comply-green">
                  {inviteMessage}
                </p>
              )}
              {inviteError && (
                <p className="rounded-md border border-comply-red/30 bg-comply-red/10 px-3 py-2 text-xs text-comply-red">
                  {inviteError}
                </p>
              )}
            </CardBody>
          </Card>
          ) : (
            <Card elevated>
              <CardBody>
                <p className="text-sm text-comply-text-secondary">
                  Only organization admins can invite members. Contact your admin to add teammates.
                </p>
              </CardBody>
            </Card>
          )}

          {canManageInvites && pendingInvites.length > 0 && (
            <Card>
              <CardHeader title="Pending invites" />
              <CardBody className="space-y-3">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="marketing-panel p-3">
                    <p className="text-sm font-medium text-comply-text-primary">{inv.email}</p>
                    <p className="text-[10px] text-comply-muted">
                      {formatInviteRole(inv.role)} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <div>
        <SectionLabel>Roles & permissions</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {teamRoles.map((role) => (
            <Card key={role.name} elevated={role.name === "Admin"}>
              <CardBody>
                <div className="flex items-center gap-2">
                  <IconUser size={18} className="text-comply-purple-border" />
                  <h2 className="text-sm font-semibold text-comply-text-primary">{role.name}</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">{role.desc}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {role.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-comply-text-secondary"
                    >
                      {p}
                    </span>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
