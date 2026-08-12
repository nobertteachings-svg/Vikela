"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCopy, IconExternalLink } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { PageHeader } from "@/components/comply/page-header";
import { TrustCenterView, type TrustCenterViewData } from "@/components/trust/trust-center-view";
import { apiPatch } from "@/lib/api";

export type TrustAdminData = TrustCenterViewData & {
  shareUrl: string;
  settings: {
    published: boolean;
    showScores: boolean;
    tagline: string;
  };
  recentRequests?: Array<{
    email?: string;
    company?: string | null;
    createdAt?: string;
  }>;
};

export function TrustAdminPanel({ initial }: { initial: TrustAdminData }) {
  const router = useRouter();
  const [published, setPublished] = useState(initial.settings.published);
  const [showScores, setShowScores] = useState(initial.settings.showScores);
  const [tagline, setTagline] = useState(initial.settings.tagline ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/trust/${initial.slug}`
      : initial.shareUrl;

  async function save(patch: Partial<{ published: boolean; showScores: boolean; tagline: string }>) {
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch("/api/v1/trust/settings", patch);
      if (typeof patch.published === "boolean") setPublished(patch.published);
      if (typeof patch.showScores === "boolean") setShowScores(patch.showScores);
      if (typeof patch.tagline === "string") setTagline(patch.tagline);
      setMessage("Saved");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Could not copy link");
    }
  }

  const previewData: TrustCenterViewData = {
    name: initial.name,
    slug: initial.slug,
    tagline: tagline || null,
    updatedAt: initial.updatedAt,
    frameworks: initial.frameworks.map((f) => ({
      id: f.id,
      name: f.name,
      ...(showScores && typeof f.score === "number" ? { score: f.score } : {}),
    })),
    policies: initial.policies,
  };

  return (
    <div className="space-y-8">
      <div className="comply-page max-w-3xl space-y-6">
        <PageHeader
          eyebrow="Trust center"
          title="Trust center"
          description="Control what customers see on your shareable trust page. Nothing is live until you publish."
        >
          <span
            className={
              published
                ? "comply-badge border-comply-green/40 bg-comply-green/15 text-comply-green normal-case"
                : "comply-badge border-white/10 bg-white/[0.04] text-comply-text-secondary normal-case"
            }
          >
            {published ? "Published" : "Unpublished"}
          </span>
        </PageHeader>

        <Card elevated>
          <CardHeader title="Sharing" />
          <CardBody className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-md border border-white/[0.06] bg-black/20 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-comply-text-primary">Publish trust center</p>
                <p className="mt-0.5 text-xs text-comply-text-secondary">
                  When on, anyone with the link can view frameworks and published policies.
                </p>
              </div>
              <input
                type="checkbox"
                checked={published}
                disabled={saving}
                onChange={(e) => void save({ published: e.target.checked })}
                className="rounded text-comply-purple"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-md border border-white/[0.06] bg-black/20 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-comply-text-primary">Show readiness scores</p>
                <p className="mt-0.5 text-xs text-comply-text-secondary">
                  Off by default — scores can reveal internal posture to prospects.
                </p>
              </div>
              <input
                type="checkbox"
                checked={showScores}
                disabled={saving}
                onChange={(e) => void save({ showScores: e.target.checked })}
                className="rounded text-comply-purple"
              />
            </label>

            <label className="block text-sm">
              <span className="text-comply-text-secondary">Tagline (optional)</span>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                onBlur={() => {
                  if (tagline !== (initial.settings.tagline ?? "")) {
                    void save({ tagline });
                  }
                }}
                placeholder="Security and compliance at Acme"
                maxLength={280}
                className="comply-input mt-1.5"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-xs text-comply-text-secondary">
                {shareUrl}
              </code>
              <ComplyButton
                type="button"
                variant="secondary"
                className="text-sm"
                onClick={() => void copyLink()}
              >
                <IconCopy size={14} className="mr-1.5 inline" />
                {copied ? "Copied" : "Copy link"}
              </ComplyButton>
              {published ? (
                <a
                  href={`/trust/${initial.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="comply-btn-ghost inline-flex items-center text-sm"
                >
                  <IconExternalLink size={14} className="mr-1.5" />
                  Open live page
                </a>
              ) : null}
            </div>
            {message ? <p className="text-xs text-comply-text-tertiary">{message}</p> : null}
          </CardBody>
        </Card>

        {(initial.recentRequests?.length ?? 0) > 0 ? (
          <Card elevated>
            <CardHeader title="Recent report requests" />
            <CardBody className="p-0 pb-1">
              <ul className="divide-y divide-white/[0.06]">
                {initial.recentRequests!.map((r, i) => (
                  <li key={`${r.email}-${r.createdAt}-${i}`} className="px-6 py-3 text-sm">
                    <p className="font-medium text-comply-text-primary">{r.email}</p>
                    <p className="text-xs text-comply-text-tertiary">
                      {r.company ? `${r.company} · ` : ""}
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="border-t border-white/[0.06] pt-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
          Visitor preview
        </p>
        <TrustCenterView data={previewData} />
      </div>
    </div>
  );
}
