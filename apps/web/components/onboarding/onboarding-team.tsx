"use client";

import { useState } from "react";
import Link from "next/link";
import { BrowserChrome } from "@/components/comply/browser-chrome";
import { StepIndicator } from "@/components/comply/step-indicator";
import { apiDelete, apiPost } from "@/lib/api";

type Invite = { id: string; email: string; role: string; initials: string };

export function OnboardingTeam() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const addInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const result = await apiPost<{ id: string; email: string }>("/api/v1/members/invite", {
        email: email.trim(),
        role: role.toUpperCase(),
      });
      const initials = email
        .slice(0, 2)
        .toUpperCase()
        .replace(/[^A-Z]/g, "X");
      setInvites((list) => [
        ...list,
        { id: result.id, email: result.email, role, initials },
      ]);
      setEmail("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setSending(false);
    }
  };

  const removeInvite = async (id: string) => {
    setBusyId(id);
    try {
      await apiDelete(`/api/v1/members/invites/${id}`);
      setInvites((list) => list.filter((i) => i.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not revoke invite");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <BrowserChrome url="app.shieldoq.com/onboarding/team" contentClassName="px-8 py-6">
      <StepIndicator currentStep={3} />

      <h1 className="text-center text-sm font-medium text-comply-text-primary">Invite your team</h1>
      <p className="mt-1 text-center text-xs text-comply-text-secondary">
        Add teammates who&apos;ll manage compliance with you.
      </p>

      <div className="mt-6 flex w-full max-w-[460px] flex-wrap items-center justify-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="h-8 w-[340px] max-w-full rounded-sm border border-[var(--border)] bg-comply-app px-3 text-xs text-comply-text-primary placeholder:text-comply-muted"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-8 w-[100px] rounded-sm border border-[var(--border)] bg-comply-app px-2 text-xs text-comply-text-primary"
        >
          <option>Admin</option>
          <option>Member</option>
          <option>Auditor</option>
        </select>
        <button type="button" onClick={() => void addInvite()} disabled={sending} className="btn-purple-cta w-[60px]">
          {sending ? "…" : "Add"}
        </button>
      </div>

      <ul className="mt-5 w-full max-w-[460px] space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-comply-card px-3 py-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-comply-purple-light text-xs font-medium text-comply-purple">
              {inv.initials}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-comply-text-primary">{inv.email}</span>
            <span className="comply-badge shrink-0 border-[var(--border-light)] bg-comply-cream text-comply-text-secondary normal-case">
              {inv.role}
            </span>
            <button
              type="button"
              onClick={() => void removeInvite(inv.id)}
              disabled={busyId === inv.id}
              className="shrink-0 px-1 text-comply-muted hover:text-comply-text-primary disabled:opacity-50"
              aria-label="Revoke invite"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex w-full max-w-[460px] items-center justify-between">
        <Link href="/dashboard" className="text-xs text-comply-muted hover:text-comply-text-secondary">
          Skip for now
        </Link>
        <Link href="/dashboard" className="btn-purple-cta w-[160px]">
          Launch dashboard
        </Link>
      </div>
    </BrowserChrome>
  );
}
