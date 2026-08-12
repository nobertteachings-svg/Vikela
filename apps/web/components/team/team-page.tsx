"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconMail, IconTrash, IconUser } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { teamRoles, type TeamRole } from "@/lib/product-config";
import type { PendingInviteRow } from "@/lib/compliance-api";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
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
const CHANGE_ROLES = ["MEMBER", "ADMIN", "AUDITOR"] as const;

function formatInviteRole(role: string): TeamRole {
  const normalized = role.toLowerCase();
  if (normalized === "admin" || normalized === "owner") return "Admin";
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
  members: initialMembers,
  pendingInvites: initialInvites,
  canManageInvites,
  seats,
}: {
  members: UiTeamMember[];
  pendingInvites: PendingInviteRow[];
  canManageInvites: boolean;
  seats: { used: number; included: number };
}) {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof INVITE_ROLES)[number]>("Member");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setTeamMembers(initialMembers);
    setPendingInvites(initialInvites);
  }, [initialMembers, initialInvites]);

  const adminCount = teamMembers.filter((m) => m.role === "Admin").length;
  const auditorCount = teamMembers.filter((m) => m.role === "Auditor").length;
  const pendingCount = pendingInvites.length;
  const seatUsedDisplay = seats.used + pendingCount;

  function refresh() {
    router.refresh();
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    try {
      const result = await apiPost<{ clerkInvitationSent?: boolean; email: string }>(
        "/api/v1/members/invite",
        {
          email: inviteEmail.trim(),
          role: inviteRole.toUpperCase(),
        }
      );
      setMessage({
        type: "success",
        text: result.clerkInvitationSent
          ? `Invitation emailed to ${result.email} via Clerk.`
          : `Invite recorded for ${result.email}.`,
      });
      setInviteEmail("");
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Invite failed" });
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(memberId: string, role: string) {
    setBusyId(memberId);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/members/${memberId}`, { role });
      setMessage({ type: "success", text: "Role updated" });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Role update failed" });
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(member: UiTeamMember) {
    if (!window.confirm(`Remove ${member.name} (${member.email}) from this workspace?`)) return;
    setBusyId(member.id);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/members/${member.id}`);
      setMessage({ type: "success", text: `${member.email} removed` });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Remove failed" });
    } finally {
      setBusyId(null);
    }
  }

  async function resendInvite(invite: PendingInviteRow) {
    setBusyId(invite.id);
    setMessage(null);
    try {
      await apiPost(`/api/v1/members/invites/${invite.id}/resend`, {});
      setMessage({ type: "success", text: `Invite resent to ${invite.email}` });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Resend failed" });
    } finally {
      setBusyId(null);
    }
  }

  async function revokeInvite(invite: PendingInviteRow) {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) return;
    setBusyId(invite.id);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/members/invites/${invite.id}`);
      setMessage({ type: "success", text: `Invite revoked for ${invite.email}` });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Revoke failed" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Admin"
        title="Team & access"
        description="Invite teammates, change roles, revoke pending invites, and manage workspace access."
      />

      {message ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          )}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <p className="text-sm text-comply-text-secondary">
        {teamMembers.length} members
        {pendingCount > 0 ? ` · ${pendingCount} pending` : ""} · {seatUsedDisplay}/{seats.included}{" "}
        seats reserved
      </p>

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <p className="relative text-sm leading-relaxed text-comply-text-secondary">
          Invitations and role changes sync through Clerk. MFA is managed in each user&apos;s Clerk
          account settings — Vikela enforces organization roles and seat limits here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={String(teamMembers.length)} accent="purple" />
        <StatCard label="Pending invites" value={String(pendingCount)} accent="amber" />
        <StatCard label="Admins" value={String(adminCount)} accent="green" />
        <StatCard
          label="Auditors"
          value={String(auditorCount)}
          accent="purple"
          hint="read-only"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card elevated>
          <CardHeader title="Members" />
          <CardBody className="p-0 pb-1">
            <DataTable>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {canManageInvites ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m) => {
                  const isOwner = m.apiRole === "OWNER";
                  const selectableRole =
                    m.apiRole === "OWNER"
                      ? "ADMIN"
                      : CHANGE_ROLES.includes(m.apiRole as (typeof CHANGE_ROLES)[number])
                        ? m.apiRole
                        : "MEMBER";
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-comply-purple-border/30 bg-comply-purple/15 text-[10px] font-semibold text-comply-purple-border">
                            {initials(m.name)}
                          </span>
                          <div>
                            <p className="font-medium">
                              {m.name}
                              {isOwner ? (
                                <span className="ml-1 text-[10px] text-comply-purple-border">
                                  (owner)
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-comply-text-tertiary">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {canManageInvites && !isOwner ? (
                          <select
                            className="comply-input h-8 w-[120px] py-1 text-xs"
                            value={selectableRole}
                            disabled={busyId === m.id}
                            onChange={(e) => void changeRole(m.id, e.target.value)}
                            aria-label={`Role for ${m.name}`}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                            <option value="AUDITOR">Auditor</option>
                          </select>
                        ) : (
                          <span className={cn("comply-badge normal-case", ROLE_STYLES[m.role])}>
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="text-comply-text-secondary">
                        {new Date(m.joined).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      {canManageInvites ? (
                        <td>
                          {!isOwner ? (
                            <button
                              type="button"
                              disabled={busyId === m.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-comply-red hover:underline disabled:opacity-50"
                              onClick={() => void removeMember(m)}
                            >
                              <IconTrash size={14} />
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-comply-text-tertiary">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
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
                    onChange={(e) =>
                      setInviteRole(e.target.value as (typeof INVITE_ROLES)[number])
                    }
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
                  onClick={() => void sendInvite()}
                >
                  <IconMail size={16} />
                  {inviting ? "Sending…" : "Send invite"}
                </ComplyButton>
                <p className="text-[11px] text-comply-text-tertiary">
                  Pending invites count toward your seat limit until accepted or revoked.
                </p>
              </CardBody>
            </Card>
          ) : (
            <Card elevated>
              <CardBody>
                <p className="text-sm text-comply-text-secondary">
                  Only organization admins can invite or manage members. Contact your admin to add
                  teammates.
                </p>
              </CardBody>
            </Card>
          )}

          {canManageInvites && pendingInvites.length > 0 ? (
            <Card>
              <CardHeader title="Pending invites" />
              <CardBody className="space-y-3">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="marketing-panel space-y-2 p-3">
                    <div>
                      <p className="text-sm font-medium text-comply-text-primary">{inv.email}</p>
                      <p className="text-[10px] text-comply-muted">
                        {formatInviteRole(inv.role)} · expires{" "}
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ComplyButton
                        variant="secondary"
                        className="h-8 px-2 text-[11px]"
                        disabled={busyId === inv.id}
                        onClick={() => void resendInvite(inv)}
                      >
                        Resend
                      </ComplyButton>
                      <ComplyButton
                        variant="ghost"
                        className="h-8 px-2 text-[11px] text-comply-red"
                        disabled={busyId === inv.id}
                        onClick={() => void revokeInvite(inv)}
                      >
                        Revoke
                      </ComplyButton>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
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
                <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                  {role.desc}
                </p>
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
