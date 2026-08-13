"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconBell,
  IconBuilding,
  IconCircleCheck,
  IconCopy,
  IconKey,
  IconLock,
  IconPlus,
  IconShieldCheck,
  IconTrash,
  IconWebhook,
  IconWorld,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { apiDelete, apiPatch, apiPost, setOrgContext } from "@/lib/api";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import type { OrgInfo, SettingsData } from "@/lib/compliance-api";
import { settingsTabs, type SettingsTab } from "@/lib/product-config";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const TAB_ICONS: Record<SettingsTab, typeof IconBuilding> = {
  General: IconBuilding,
  Notifications: IconBell,
  Security: IconLock,
  "API Keys": IconKey,
  Webhooks: IconWebhook,
  "Danger zone": IconTrash,
};

const NOTIFICATION_ROWS = [
  {
    key: "gapAlerts",
    label: "New compliance gaps",
    description: "Critical/high gaps, emailed to admins and posted to connected Slack/Teams.",
  },
  {
    key: "scanComplete",
    label: "Scan completed",
    description: "Scan summary, emailed to admins and posted to connected Slack/Teams.",
  },
  {
    key: "memberInvites",
    label: "Member invites",
    description: "When someone is invited to your organization (email).",
  },
] as const;

export function SettingsPageContent({
  org: orgInfo,
  settings: settingsData,
}: {
  org: OrgInfo;
  settings: SettingsData;
}) {
  const [tab, setTab] = useState<SettingsTab>("General");
  const [slug, setSlug] = useState(orgInfo.slug);
  const [name, setName] = useState(orgInfo.name);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(settingsData.settings.notifications);
  const [security, setSecurity] = useState(settingsData.settings.security);
  const [apiKeys, setApiKeys] = useState(settingsData.apiKeys);
  const [webhooks, setWebhooks] = useState(settingsData.webhooks);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<{
    tone: "success" | "warn" | "error";
    text: string;
  } | null>(null);
  const [newAllowlistEntry, setNewAllowlistEntry] = useState("");
  const [allowlistError, setAllowlistError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [dangerMessage, setDangerMessage] = useState<string | null>(null);
  const org = {
    id: orgInfo.id,
    name: orgInfo.name,
    slug: orgInfo.slug,
    legalName: orgInfo.name,
    website: "",
    industry: "Technology",
    employeeCount: String(orgInfo.memberCount),
    timezone: "America/Los_Angeles",
    plan: orgInfo.plan,
    dataRegion: "US",
    trustCenterSlug: orgInfo.slug,
    createdAt: new Date().toISOString(),
  };
  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("vikela_org_slug") : null;
    if (stored) setSlug(stored);
  }, []);

  const handleSaveGeneral = async () => {
    try {
      await apiPatch("/api/v1/org", { name });
      setOrgContext(slug);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaved(false);
    }
  };

  const handleSaveNotifications = async () => {
    await apiPatch("/api/v1/settings", {
      notifications: {
        gapAlerts: Boolean(notifications.gapAlerts),
        scanComplete: Boolean(notifications.scanComplete),
        memberInvites: Boolean(notifications.memberInvites),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveSecurity = async () => {
    await apiPatch("/api/v1/settings", {
      security: { ipAllowlist: security.ipAllowlist },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAllowlistEntry = () => {
    const entry = newAllowlistEntry.trim();
    if (!entry) return;
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Pattern = /^[0-9a-f:]+(\/\d{1,3})?$/i;
    if (!ipv4Pattern.test(entry) && !ipv6Pattern.test(entry)) {
      setAllowlistError("Enter a valid IP address or CIDR range (e.g. 203.0.113.42 or 192.168.1.0/24).");
      return;
    }
    if (security.ipAllowlist.includes(entry)) {
      setAllowlistError("That entry is already on the allowlist.");
      return;
    }
    setSecurity((prev) => ({
      ...prev,
      ipAllowlist: [...prev.ipAllowlist, entry],
    }));
    setNewAllowlistEntry("");
    setAllowlistError(null);
  };

  const handleRemoveAllowlistEntry = (entry: string) => {
    setSecurity((prev) => ({
      ...prev,
      ipAllowlist: prev.ipAllowlist.filter((ip) => ip !== entry),
    }));
  };

  const handleCreateWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) return;
    const created = await apiPost<{
      id: string;
      name: string;
      url: string;
      events: string[];
      secret: string;
      isActive: boolean;
    }>("/api/v1/settings/webhooks", {
      name: webhookName.trim(),
      url: webhookUrl.trim(),
    });
    setWebhooks((prev) => [
      {
        id: created.id,
        name: created.name,
        url: created.url,
        events: created.events,
        isActive: created.isActive,
        createdAt: new Date().toISOString(),
      }, ...prev,
    ]);
    setWebhookName("");
    setWebhookUrl("");
    setShowWebhookForm(false);
    if (typeof window !== "undefined") {
      window.alert(`Copy your webhook signing secret now (shown once):\n\n${created.secret}`);
    }
  };

  async function handleExport(format: "JSON" | "CSV" | "PDF") {
    setExportingFormat(format);
    setDangerMessage(null);
    try {
      const q = format === "PDF" ? "pdf" : format.toLowerCase();
      const { blob, filename } = await apiGetBlob(
        `/api/v1/settings/export?format=${q}`,
        `vikela-export.${q === "pdf" ? "html" : q}`
      );
      downloadBlob(blob, filename);
      setDangerMessage(`Exported ${filename}`);
    } catch (e) {
      setDangerMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingFormat(null);
    }
  }

  function handleDeleteOrganization() {
    if (deleteConfirm.trim() !== org.slug) {
      setDangerMessage(`Type ${org.slug} exactly to enable deletion.`);
      return;
    }
    setDangerMessage(
      "Organization deletion is managed in Clerk (Organization settings, Delete). Vikela does not hard-delete orgs from this screen yet."
    );
  }

  async function handleTestWebhook(webhookId: string) {
    setTestingWebhookId(webhookId);
    setWebhookMessage(null);
    try {
      const result = await apiPost<{
        delivered: boolean;
        accepted: boolean;
        scanId: string;
        httpStatus: number | null;
        error: string | null;
        message: string;
      }>(`/api/v1/settings/webhooks/${webhookId}/test`);
      const scanBit = result.scanId ? ` (scan ${result.scanId.slice(0, 8)}…)` : "";
      if (result.accepted) {
        setWebhookMessage({
          tone: "success",
          text: `${result.message}${scanBit}`,
        });
      } else if (result.delivered) {
        setWebhookMessage({
          tone: "warn",
          text: `${result.message}${scanBit}`,
        });
      } else {
        setWebhookMessage({
          tone: "error",
          text: `${result.message}${scanBit}`,
        });
      }
    } catch (e) {
      setWebhookMessage({
        tone: "error",
        text: e instanceof Error ? e.message : "Test delivery failed",
      });
    } finally {
      setTestingWebhookId(null);
    }
  }

  const handleCreateApiKey = async () => {
    const created = await apiPost<{ id: string; name: string; prefix: string; key: string }>(
      "/api/v1/settings/api-keys",
      { name: "New API key" }
    );
    setApiKeys((prev) => [
      {
        id: created.id,
        name: created.name,
        prefix: created.prefix,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      }, ...prev,
    ]);
    if (typeof window !== "undefined") {
      window.alert(`Copy your API key now (shown once):\n\n${created.key}`);
    }
  };

  const memberCount = orgInfo.memberCount;

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Organization profile, notifications, security controls, and API access for your workspace."
      >
        <Link href="/billing" className="comply-btn-secondary inline-flex h-9 items-center px-4 text-sm">
          View billing
        </Link>
      </PageHeader>

      {/* Workspace overview hero */}
      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-comply-purple/25 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20 shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]">
              <IconShieldCheck size={28} className="text-comply-purple-border" stroke={1.5} />
            </span>
            <div>
              <SectionLabel>Workspace</SectionLabel>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-comply-text-primary">
                {org.name}
              </h2>
              <p className="mt-1 font-mono text-sm text-comply-text-secondary">
                {org.slug} · {org.id}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-sm border border-comply-purple-border/40 bg-comply-purple/15 px-2 py-0.5 text-[10px] font-medium text-comply-purple-border">
                  {org.plan} plan
                </span>
                <span className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-comply-text-secondary">
                  {org.dataRegion} data region
                </span>
                <span className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-comply-text-secondary">
                  Since {new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-comply-text-secondary lg:min-w-[220px]">
            {[
              `Trust center: /trust/${org.trustCenterSlug}`,
              `${memberCount} team members`,
              `Plan: ${orgInfo.plan} · ${orgInfo.openGaps} open gaps`,
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <IconCircleCheck size={16} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Team members" value={String(memberCount)} accent="purple" />
        <StatCard
          label="Help center"
          value="Docs"
          accent="green"
          hint="In-app guide"
        />
        <StatCard label="API keys" value={String(apiKeys.length)} accent="amber" />
        <StatCard label="Webhooks" value={String(webhooks.filter((w) => w.isActive).length)} accent="purple" hint="active" />
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Sidebar tabs */}
        <Card className="shrink-0 xl:w-56">
          <CardBody className="flex flex-row gap-1 overflow-x-auto p-2 xl:flex-col xl:overflow-visible">
            {settingsTabs.map((t) => {
              const Icon = TAB_ICONS[t];
              const isDanger = t === "Danger zone";
              return (
                <button
                  key={t}
                  type="button"
                  data-testid={`settings-tab-${t.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                    tab === t
                      ? isDanger
                        ? "bg-comply-red/20 font-medium text-comply-red"
                        : "bg-comply-purple font-medium text-white"
                      : isDanger
                        ? "text-comply-red/80 hover:bg-comply-red/10"
                        : "text-comply-text-secondary hover:bg-white/[0.04] hover:text-comply-text-primary"
                  )}
                >
                  <Icon size={16} stroke={1.5} />
                  {t}
                </button>
              );
            })}
          </CardBody>
        </Card>

        <div className="min-w-0 flex-1 space-y-6">
          {tab === "General" && (
            <>
              <Card elevated>
                <CardHeader title="Organization profile" />
                <CardBody className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-comply-text-secondary">Organization name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="comply-input mt-1.5"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Legal name</span>
                    <input defaultValue={org.legalName} className="comply-input mt-1.5" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Website</span>
                    <input defaultValue={org.website} className="comply-input mt-1.5" type="url" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Industry</span>
                    <select defaultValue={org.industry} className="comply-input mt-1.5">
                      <option>B2B SaaS</option>
                      <option>Healthcare</option>
                      <option>Fintech</option>
                      <option>E-commerce</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Company size</span>
                    <select defaultValue={org.employeeCount} className="comply-input mt-1.5">
                      <option>1-10</option>
                      <option>11-50</option>
                      <option>51-200</option>
                      <option>201-1000</option>
                      <option>1000+</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Timezone</span>
                    <select defaultValue={org.timezone} className="comply-input mt-1.5">
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Data region</span>
                    <input defaultValue={org.dataRegion} readOnly className="comply-input mt-1.5 opacity-70" />
                  </label>
                </CardBody>
              </Card>

              <Card elevated>
                <CardHeader
                  title="Developer context"
                  action={
                    <span className="font-mono text-[10px] text-comply-text-tertiary">X-Org-Slug header</span>
                  }
                />
                <CardBody className="space-y-4">
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Org slug (API &amp; CLI)</span>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="comply-input flex-1 font-mono"
                      />
                      <button
                        type="button"
                        className="comply-btn-ghost shrink-0 px-3"
                        onClick={() => navigator.clipboard?.writeText(slug)}
                        aria-label="Copy slug"
                      >
                        <IconCopy size={16} />
                      </button>
                    </div>
                  </label>
                  <label className="block text-sm">
                    <span className="text-comply-text-secondary">Trust center URL</span>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-white/[0.08] bg-black/25 px-3 py-2.5">
                      <IconWorld size={16} className="text-comply-purple-border" />
                      <span className="font-mono text-xs text-comply-text-secondary">
                        /trust/{org.trustCenterSlug}
                      </span>
                      <Link
                        href="/trust"
                        className="ml-auto text-xs font-medium text-comply-purple-border hover:underline"
                      >
                        Manage &amp; publish
                      </Link>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-comply-text-tertiary">
                      Unpublished by default. Publish from Trust center when you&apos;re ready to share
                      with customers.
                    </p>
                  </label>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <ComplyButton variant="primary" className="text-sm" onClick={handleSaveGeneral}>
                      {saved ? "Saved" : "Save changes"}
                    </ComplyButton>
                    {saved && (
                      <span className="text-xs text-comply-green">Org context updated in this browser</span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </>
          )}

          {tab === "Notifications" && (
            <Card elevated>
              <CardHeader title="Alert preferences" />
              <CardBody className="space-y-3 p-0 sm:p-0">
                <div className="border-b border-white/[0.06] px-6 py-4">
                  <p className="text-sm text-comply-text-secondary">
                    Scan complete and gap alert emails go to org owners and admins. The same events
                    are also delivered to connected{" "}
                    <Link href="/integrations" className="text-comply-purple-border hover:underline">
                      Slack and Microsoft Teams
                    </Link>{" "}
                    integrations. Weekly digest email is not available yet.
                  </p>
                </div>
                <div className="hidden border-b border-white/[0.06] px-6 py-2 sm:grid sm:grid-cols-[1fr_80px_100px] sm:gap-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                    Event
                  </span>
                  <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                    Email
                  </span>
                  <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                    Slack / Teams
                  </span>
                </div>
                {NOTIFICATION_ROWS.map((n) => (
                  <div
                    key={n.key}
                    className="border-b border-white/[0.06] px-6 py-4 last:border-0"
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_80px_100px] sm:items-center">
                      <div>
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-comply-text-primary">
                          {n.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-comply-text-secondary">
                          {n.description}
                        </p>
                      </div>
                      <label className="flex items-center justify-center gap-2 sm:justify-center">
                        <span className="text-xs text-comply-muted sm:hidden">Email</span>
                        <input
                          type="checkbox"
                          checked={Boolean(notifications[n.key])}
                          onChange={(e) =>
                            setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))
                          }
                          className="rounded text-comply-purple"
                        />
                      </label>
                      <div className="flex items-center justify-center">
                        <span className="text-xs text-comply-muted sm:hidden">Slack / Teams</span>
                        {n.key === "memberInvites" ? (
                          <span className="text-[10px] text-comply-text-tertiary">Email only</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={Boolean(notifications[n.key])}
                            onChange={(e) =>
                              setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))
                            }
                            aria-label={`${n.label} Slack and Teams alerts`}
                            className="rounded text-comply-purple"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="px-6 py-4">
                  <ComplyButton variant="primary" className="text-sm" onClick={() => void handleSaveNotifications()}>
                    Save notification preferences
                  </ComplyButton>
                </div>
              </CardBody>
            </Card>
          )}

          {tab === "Security" && (
            <>
              <Card elevated>
                <CardHeader title="Authentication" />
                <CardBody className="space-y-3">
                  <p className="text-sm leading-relaxed text-comply-text-secondary">
                    Sign-in, MFA, and organization membership are managed in{" "}
                    <a
                      href="https://dashboard.clerk.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-comply-purple-border hover:underline"
                    >
                      Clerk
                    </a>
                    . Configure MFA policies and session settings there. Vikela does not override them.
                  </p>
                  <p className="text-sm leading-relaxed text-comply-text-secondary">
                    SSO / SAML is available through Clerk for Enterprise organizations. Contact sales if you need
                    IdP-initiated login for your workspace.
                  </p>
                </CardBody>
              </Card>

              <Card elevated>
                <CardHeader title="IP allowlist" />
                <CardBody className="space-y-4">
                  <p className="text-sm leading-relaxed text-comply-text-secondary">
                    Restrict API key requests (<span className="font-mono text-xs">vk_…</span>) to listed IPs
                    and CIDR ranges. Clerk browser sessions are not affected.
                  </p>
                  <ul className="space-y-2">
                    {security.ipAllowlist.length === 0 ? (
                      <li className="rounded-md border border-dashed border-white/[0.08] px-3 py-2 text-xs text-comply-muted">
                        No restrictions, all IPs can use API keys.
                      </li>
                    ) : (
                      security.ipAllowlist.map((ip) => (
                        <li
                          key={ip}
                          className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black/25 px-3 py-2 font-mono text-xs text-comply-text-secondary"
                        >
                          {ip}
                          <button
                            type="button"
                            onClick={() => handleRemoveAllowlistEntry(ip)}
                            className="text-comply-muted transition-colors hover:text-comply-red"
                            aria-label={`Remove ${ip}`}
                          >
                            <IconTrash size={14} />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[220px] flex-1 text-sm">
                      <span className="text-comply-text-secondary">Add IP or CIDR</span>
                      <input
                        value={newAllowlistEntry}
                        onChange={(e) => {
                          setNewAllowlistEntry(e.target.value);
                          setAllowlistError(null);
                        }}
                        placeholder="203.0.113.42 or 192.168.1.0/24"
                        className="mt-1.5 w-full rounded-md border border-white/[0.08] bg-black/25 px-3 py-2 font-mono text-xs text-comply-text-primary"
                      />
                    </label>
                    <ComplyButton variant="ghost" className="gap-1 text-sm" onClick={handleAddAllowlistEntry}>
                      <IconPlus size={16} />
                      Add entry
                    </ComplyButton>
                  </div>
                  {allowlistError ? (
                    <p className="text-xs text-comply-red">{allowlistError}</p>
                  ) : null}
                  <ComplyButton variant="primary" className="text-sm" onClick={() => void handleSaveSecurity()}>
                    {saved ? "Saved" : "Save IP allowlist"}
                  </ComplyButton>
                  <p className="text-xs text-comply-muted">
                    Enforced on API key auth behind Railway/Vercel load balancers.
                    {" · "}
                    <Link href="/security" className="comply-link">
                      Platform security overview
                    </Link>
                  </p>
                </CardBody>
              </Card>
            </>
          )}

          {tab === "API Keys" && (
            <Card elevated>
              <CardHeader
                title="API keys"
                action={
                  <ComplyButton variant="primary" className="gap-1 text-xs" onClick={() => void handleCreateApiKey()}>
                    <IconPlus size={14} />
                    Create key
                  </ComplyButton>
                }
              />
              <CardBody className="p-0 pb-1">
                <DataTable>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Key</th>
                      <th>Scopes</th>
                      <th>Last used</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td>
                          <p className="font-medium">{key.name}</p>
                        </td>
                        <td className="font-mono text-xs text-comply-text-secondary">{key.prefix}…</td>
                        <td>
                          <span className="rounded-sm border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-comply-text-secondary">
                            read
                          </span>
                        </td>
                        <td className="text-comply-text-secondary">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Never"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="text-xs font-medium text-comply-red hover:underline"
                            onClick={() => {
                              void apiDelete(`/api/v1/settings/api-keys/${key.id}`).then(() =>
                                setApiKeys((prev) => prev.filter((k) => k.id !== key.id))
                              );
                            }}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <p className="border-t border-white/[0.06] px-6 py-4 text-xs leading-relaxed text-comply-muted">
                  Keys authenticate the Vikela API and CI scanners. Store secrets in your vault, keys are
                  shown only once at creation.
                </p>
              </CardBody>
            </Card>
          )}

          {tab === "Webhooks" && (
            <Card elevated>
              <CardHeader
                title="Outbound webhooks"
                action={
                  <ComplyButton
                    variant="secondary"
                    className="gap-1 text-xs"
                    onClick={() => setShowWebhookForm((v) => !v)}
                  >
                    <IconPlus size={14} />
                    Add endpoint
                  </ComplyButton>
                }
              />
              <CardBody className="space-y-4">
                <p className="text-sm text-comply-text-secondary">
                  Endpoints receive HMAC-signed POSTs for{" "}
                  <span className="font-mono text-xs">scan.completed</span> and{" "}
                  <span className="font-mono text-xs">gap.created</span>. Delivery is fire-and-forget
                  (no retries yet).
                </p>
                {showWebhookForm && (
                  <div className="marketing-panel space-y-3 p-4">
                    <label className="block text-sm">
                      <span className="text-comply-text-secondary">Name</span>
                      <input
                        value={webhookName}
                        onChange={(e) => setWebhookName(e.target.value)}
                        className="comply-input mt-1.5"
                        placeholder="Production alerts"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-comply-text-secondary">Endpoint URL</span>
                      <input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="comply-input mt-1.5 font-mono text-xs"
                        placeholder="https://example.com/webhooks/vikela"
                        type="url"
                      />
                    </label>
                    <div className="flex gap-2">
                      <ComplyButton
                        variant="primary"
                        className="text-xs"
                        onClick={() => void handleCreateWebhook()}
                        disabled={!webhookName.trim() || !webhookUrl.trim()}
                      >
                        Create webhook
                      </ComplyButton>
                      <ComplyButton variant="ghost" className="text-xs" onClick={() => setShowWebhookForm(false)}>
                        Cancel
                      </ComplyButton>
                    </div>
                  </div>
                )}
                {webhooks.length === 0 && !showWebhookForm && (
                  <p className="text-sm text-comply-text-tertiary">No webhooks configured yet.</p>
                )}
                {webhookMessage && (
                  <p
                    className={cn(
                      "rounded-md px-3 py-2 text-xs",
                      webhookMessage.tone === "success" &&
                        "bg-emerald-500/10 text-emerald-300",
                      webhookMessage.tone === "warn" && "bg-amber-500/10 text-amber-200",
                      webhookMessage.tone === "error" && "bg-red-500/10 text-red-300"
                    )}
                    role="status"
                  >
                    {webhookMessage.text}
                  </p>
                )}
                {webhooks.map((wh) => (
                  <div key={wh.id} className="marketing-panel relative p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-comply-text-primary">{wh.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-comply-text-tertiary">{wh.url}</p>
                      </div>
                      <span
                        className={cn(
                          "comply-badge normal-case text-[10px]",
                          wh.isActive
                            ? "border-comply-green/30 bg-comply-green/10 text-comply-green"
                            : "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text"
                        )}
                      >
                        {wh.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {wh.events.map((e) => (
                        <span
                          key={e}
                          className="rounded-sm border border-comply-purple-border/30 bg-comply-purple/10 px-1.5 py-0.5 font-mono text-[10px] text-comply-purple-border"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-comply-muted">
                      Created {new Date(wh.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <ComplyButton
                        variant="ghost"
                        className="text-xs"
                        disabled={testingWebhookId === wh.id}
                        onClick={() => void handleTestWebhook(wh.id)}
                      >
                        {testingWebhookId === wh.id ? "Sending…" : "Test"}
                      </ComplyButton>
                      <button
                        type="button"
                        className="text-xs font-medium text-comply-red hover:underline"
                        onClick={() => {
                          void apiDelete(`/api/v1/settings/webhooks/${wh.id}`).then(() =>
                            setWebhooks((prev) => prev.filter((w) => w.id !== wh.id))
                          );
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {tab === "Danger zone" && (
            <>
              <Card elevated>
                <CardHeader title="Export workspace data" />
                <CardBody className="space-y-4">
                  <p className="text-sm leading-relaxed text-comply-text-secondary">
                    Download gaps, controls, evidence metadata, and scan history. Auditor packages include
                    mapped frameworks and policy snapshots.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["JSON", "CSV", "PDF"] as const).map((fmt) => (
                      <ComplyButton
                        key={fmt}
                        variant="secondary"
                        className="text-xs"
                        data-testid={`settings-export-${fmt.toLowerCase()}`}
                        disabled={exportingFormat !== null}
                        onClick={() => void handleExport(fmt)}
                      >
                        {exportingFormat === fmt ? "Exporting…" : `Export ${fmt}`}
                      </ComplyButton>
                    ))}
                  </div>
                  <p className="text-xs text-comply-muted">
                    PDF downloads a printable HTML report (use Print, Save as PDF).
                  </p>
                  {dangerMessage ? (
                    <p className="text-xs text-comply-text-secondary">{dangerMessage}</p>
                  ) : null}
                </CardBody>
              </Card>

              <div className="marketing-panel relative overflow-hidden border-comply-red/30 p-6">
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-comply-red/10 to-transparent"
                  aria-hidden
                />
                <div className="relative">
                  <SectionLabel>Danger zone</SectionLabel>
                  <h3 className="mt-2 text-lg font-medium text-comply-text-primary">
                    Delete organization
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-comply-text-secondary">
                    Permanently remove <strong className="text-comply-text-primary">{org.name}</strong>,
                    all integrations, evidence, scan history, and team access. This cannot be undone.
                  </p>
                  <label className="mt-4 block text-sm">
                    <span className="text-comply-text-secondary">
                      Type <span className="font-mono text-comply-red">{org.slug}</span> to confirm
                    </span>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={org.slug}
                      className="comply-input mt-1.5 max-w-xs border-comply-red/30"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={deleteConfirm.trim() !== org.slug}
                    onClick={handleDeleteOrganization}
                    className="mt-4 rounded-md border border-comply-red px-4 py-2 text-sm font-medium text-comply-red transition-colors hover:bg-comply-red/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete organization
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
