"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { PageHeader } from "@/components/comply/page-header";
import { ComplyButton } from "@/components/comply/button";
import type { PolicyListItem } from "@/lib/compliance-api";
import { cn } from "@/lib/utils";

type PolicyEditorPayload = {
  id: string;
  title: string;
  content: string;
  status: string;
  version: number;
  updatedAt: string;
};

export function PoliciesClient({
  initialPolicies,
  canGenerate = true,
}: {
  initialPolicies: PolicyListItem[];
  canGenerate?: boolean;
}) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [selectedId, setSelectedId] = useState(initialPolicies[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingBundle, setGeneratingBundle] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDirty =
    Boolean(selectedId) &&
    (title !== savedSnapshot.title || content !== savedSnapshot.content);

  const applyEditorState = useCallback((p: PolicyEditorPayload) => {
    setContent(p.content);
    setTitle(p.title);
    setSavedSnapshot({ title: p.title, content: p.content });
    setPolicies((prev) =>
      prev.map((item) =>
        item.id === p.id
          ? {
              ...item,
              title: p.title,
              status: p.status as PolicyListItem["status"],
              version: p.version,
              updatedAt: p.updatedAt,
              preview: p.content.slice(0, 200),
            }
          : item
      )
    );
  }, []);

  const loadPolicy = useCallback(
    async (id: string) => {
      const p = await apiGet<PolicyEditorPayload & { updatedAt: string | Date }>(
        `/api/v1/policies/${id}`
      );
      applyEditorState({
        id: p.id,
        title: p.title,
        content: p.content,
        status: p.status,
        version: p.version,
        updatedAt:
          typeof p.updatedAt === "string" ? p.updatedAt : new Date(p.updatedAt).toISOString(),
      });
    },
    [applyEditorState]
  );

  useEffect(() => {
    if (selectedId) loadPolicy(selectedId).catch(console.error);
  }, [selectedId, loadPolicy]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function selectPolicy(id: string) {
    if (id === selectedId) return;
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    setMessage(null);
    setSelectedId(id);
  }

  async function save() {
    if (!selectedId || !isDirty) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPatch<{ id: string; status: string; version: number }>(
        `/api/v1/policies/${selectedId}`,
        { title, content }
      );
      setSavedSnapshot({ title, content });
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                title,
                version: result.version,
                status: result.status as PolicyListItem["status"],
                preview: content.slice(0, 200),
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
      setMessage({ type: "success", text: "Policy saved" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!selectedId) return;
    if (isDirty && !window.confirm("Unsaved edits will be replaced. Continue?")) return;
    setRegenerating(true);
    setMessage(null);
    try {
      const p = await apiPost<PolicyEditorPayload>(
        `/api/v1/policies/${selectedId}/regenerate`,
        {}
      );
      applyEditorState(p);
      setMessage({ type: "success", text: "Policy regenerated" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Regenerate failed" });
    } finally {
      setRegenerating(false);
    }
  }

  async function publish() {
    if (!selectedId) return;
    setPublishing(true);
    setMessage(null);
    try {
      const result = await apiPost<{ id: string; status: string; version: number }>(
        `/api/v1/policies/${selectedId}/publish`,
        {}
      );
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? {
                ...p,
                status: result.status as PolicyListItem["status"],
                version: result.version,
              }
            : p
        )
      );
      setMessage({ type: "success", text: "Policy published" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Publish failed" });
    } finally {
      setPublishing(false);
    }
  }

  async function exportMarkdown() {
    if (!selectedId) return;
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob(
        `/api/v1/policies/${selectedId}/export`,
        "policy.md"
      );
      downloadBlob(blob, filename);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  async function generateBundle() {
    setGeneratingBundle(true);
    setMessage(null);
    try {
      await apiPost("/api/v1/policies/generate-bundle", {});
      const list = await apiGet<PolicyListItem[]>("/api/v1/policies");
      setPolicies(list);
      if (list[0]) setSelectedId(list[0].id);
      setMessage({ type: "success", text: "Policy bundle generated" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Generate failed" });
    } finally {
      setGeneratingBundle(false);
    }
  }

  const selected = policies.find((p) => p.id === selectedId);
  const working = saving || regenerating || publishing || exporting || generatingBundle;

  return (
    <div className="comply-page !max-w-none space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Policies"
        description="Generate, edit, and publish policies mapped to your frameworks."
        className="border-b-0 pb-0"
      >
        {canGenerate ? (
          <ComplyButton variant="secondary" onClick={generateBundle} disabled={working}>
            {generatingBundle ? "Generating…" : "Generate bundle"}
          </ComplyButton>
        ) : (
          <a href="/billing" className="comply-btn-secondary text-sm">
            Upgrade for generator
          </a>
        )}
      </PageHeader>

      {!canGenerate ? (
        <p className="rounded-lg border border-comply-amber/30 bg-comply-amber/10 px-4 py-3 text-sm text-comply-amber-text">
          Policy generation requires Growth or higher. You can still view and edit existing drafts.
        </p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          )}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex min-h-[calc(100vh-12rem)] gap-0 overflow-hidden rounded-lg border border-white/[0.08]">
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-white/[0.06] bg-black/20 p-4">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
            Documents
          </p>
          <ul className="space-y-1">
            {policies.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPolicy(p.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left text-xs transition-colors",
                  selectedId === p.id
                    ? "nav-active-glow bg-comply-green font-medium text-white"
                    : "text-comply-text-secondary hover:bg-white/[0.04] hover:text-comply-text-primary"
                )}
              >
                <p className="font-medium">{p.title}</p>
                <p
                  className={cn(
                    "mt-0.5",
                    selectedId === p.id ? "text-white/70" : "text-comply-text-tertiary"
                  )}
                >
                  {p.status} · {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </ul>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/15 px-4 py-3">
            <ComplyButton
              variant="ghost"
              className="px-2 py-1 text-xs"
              onClick={exportMarkdown}
              disabled={!selectedId || working}
            >
              {exporting ? "Exporting…" : "Export MD"}
            </ComplyButton>
            {isDirty ? (
              <span className="text-xs text-amber-300/90">Unsaved changes</span>
            ) : null}
            <div className="flex-1" />
            <ComplyButton
              variant="secondary"
              className="text-xs"
              onClick={save}
              disabled={!selectedId || !isDirty || working}
            >
              {saving ? "Saving…" : "Save"}
            </ComplyButton>
            <ComplyButton
              variant="secondary"
              className="text-xs"
              onClick={regenerate}
              disabled={!selectedId || working || !canGenerate}
            >
              {regenerating ? "Regenerating…" : "Regenerate with AI"}
            </ComplyButton>
            <ComplyButton
              variant="primary"
              className="text-xs"
              onClick={publish}
              disabled={!selectedId || working}
            >
              {publishing ? "Publishing…" : "Publish"}
            </ComplyButton>
          </div>
          <div className="flex-1 overflow-auto p-6 lg:p-8">
            {selected ? (
              <>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mb-5 w-full border-0 bg-transparent text-2xl font-medium tracking-tight text-comply-text-primary focus:outline-none"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px] w-full resize-none border-0 bg-transparent font-sans text-sm leading-relaxed text-comply-text-secondary focus:outline-none whitespace-pre-wrap"
                />
              </>
            ) : (
              <div className="comply-empty border-0">
                <p className="text-sm text-comply-text-secondary">Select or generate a policy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
