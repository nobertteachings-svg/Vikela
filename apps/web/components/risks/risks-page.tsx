"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import {
  IconAlertTriangle,
  IconChartDots,
  IconCircleCheck,
  IconPlus,
  IconShield,
  IconTrash,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { riskMatrixLabels, type RiskStatus } from "@/lib/product-config";
import type { UiRisk, UiTeamMember } from "@/lib/ui-mappers";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const STATUS_STYLES: Record<RiskStatus, string> = {
  Open: "border-comply-red/30 bg-comply-red/10 text-comply-red",
  Mitigating: "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  Accepted: "border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border",
  Closed: "border-comply-green/30 bg-comply-green/10 text-comply-green",
};

/** Scores are likelihood × impact on a 1-3 scale (max 9). */
function riskScoreColor(score: number) {
  if (score >= 6) return "text-comply-red";
  if (score >= 3) return "text-comply-amber-text";
  return "text-comply-green-text";
}

const STATUS_OPTIONS: UiRisk["status"][] = ["Open", "Mitigating", "Accepted", "Closed"];

const CATEGORY_OPTIONS = [
  "Security",
  "Operational",
  "Compliance",
  "Third-party",
  "Financial",
  "Technology",
] as const;

function statusToApi(status: UiRisk["status"]): string {
  if (status === "Mitigating") return "MITIGATED";
  if (status === "Accepted") return "ACCEPTED";
  if (status === "Closed") return "CLOSED";
  return "OPEN";
}

function statusFromApi(status: string): UiRisk["status"] {
  if (status === "MITIGATED") return "Mitigating";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "CLOSED") return "Closed";
  return "Open";
}

function dimLabel(n: number): string {
  if (n <= 1) return "Low";
  if (n === 2) return "Medium";
  return "High";
}

type RiskApiRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  status: string;
  mitigation: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
};

function toUiRisk(row: RiskApiRow): UiRisk {
  return {
    id: row.id,
    name: row.title,
    category: row.category || "Operational",
    likelihood: dimLabel(row.likelihood),
    impact: dimLabel(row.impact),
    score: row.score,
    owner: row.ownerName || row.ownerEmail || "—",
    ownerId: row.ownerId,
    mitigation: row.mitigation ?? "",
    status: statusFromApi(row.status),
    matrix: { l: row.likelihood, i: row.impact },
    description: row.description,
    nextReview: row.nextReviewAt ? row.nextReviewAt.slice(0, 10) : null,
  };
}

type RiskFormState = {
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  ownerId: string;
  nextReviewAt: string;
};

const EMPTY_FORM: RiskFormState = {
  title: "",
  description: "",
  category: "Operational",
  likelihood: 2,
  impact: 2,
  mitigation: "",
  ownerId: "",
  nextReviewAt: "",
};

function formFromRisk(r: UiRisk): RiskFormState {
  return {
    title: r.name,
    description: r.description,
    category: r.category,
    likelihood: r.matrix.l,
    impact: r.matrix.i,
    mitigation: r.mitigation,
    ownerId: r.ownerId ?? "",
    nextReviewAt: r.nextReview ?? "",
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RisksPageContent({
  risks: initialRisks,
  members,
}: {
  risks: UiRisk[];
  members: UiTeamMember[];
}) {
  const router = useRouter();
  const [risks, setRisks] = useState(initialRisks);
  const categories = ["All", ...Array.from(new Set(risks.map((r) => r.category))).sort()];
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(initialRisks[0]?.id ?? "");
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [form, setForm] = useState<RiskFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setRisks(initialRisks);
    if (selectedId && !initialRisks.some((r) => r.id === selectedId)) {
      setSelectedId(initialRisks[0]?.id ?? "");
    } else if (!selectedId && initialRisks[0]) {
      setSelectedId(initialRisks[0].id);
    }
  }, [initialRisks, selectedId]);

  const filtered = useMemo(
    () => (category === "All" ? risks : risks.filter((r) => r.category === category)),
    [category, risks]
  );

  const selected = risks.find((r) => r.id === selectedId) ?? filtered[0];

  const openCount = risks.filter((r) => r.status === "Open").length;
  const mitigatingCount = risks.filter((r) => r.status === "Mitigating").length;
  const highScoreCount = risks.filter((r) => r.score >= 6).length;
  const dueSoonCount = risks.filter((r) => {
    if (!r.nextReview) return false;
    const due = new Date(`${r.nextReview}T00:00:00.000Z`).getTime();
    const in30 = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return due <= in30;
  }).length;

  function openAdd() {
    setForm(EMPTY_FORM);
    setMode("add");
    setMessage(null);
  }

  function openEdit(r: UiRisk) {
    setForm(formFromRisk(r));
    setSelectedId(r.id);
    setMode("edit");
    setMessage(null);
  }

  async function createRisk() {
    if (!form.title.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const row = await apiPost<RiskApiRow>("/api/v1/risks", {
        title: form.title,
        description: form.description,
        category: form.category,
        likelihood: form.likelihood,
        impact: form.impact,
        mitigation: form.mitigation,
        ownerId: form.ownerId || null,
        nextReviewAt: form.nextReviewAt || null,
      });
      const ui = toUiRisk(row);
      setRisks((prev) => [ui, ...prev]);
      setSelectedId(ui.id);
      setMode("view");
      setForm(EMPTY_FORM);
      setMessage({ type: "success", text: "Risk added" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to add risk" });
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!selected || !form.title.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const row = await apiPatch<RiskApiRow>(`/api/v1/risks/${selected.id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        likelihood: form.likelihood,
        impact: form.impact,
        mitigation: form.mitigation,
        ownerId: form.ownerId || null,
        nextReviewAt: form.nextReviewAt || null,
      });
      const ui = toUiRisk(row);
      setRisks((prev) => prev.map((r) => (r.id === ui.id ? ui : r)));
      setMode("view");
      setMessage({ type: "success", text: "Risk updated" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: UiRisk["status"]) {
    setSaving(true);
    setMessage(null);
    try {
      const row = await apiPatch<RiskApiRow>(`/api/v1/risks/${id}`, {
        status: statusToApi(status),
      });
      setRisks((prev) => prev.map((r) => (r.id === id ? toUiRisk(row) : r)));
      setMessage({ type: "success", text: "Status updated" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRisk(id: string) {
    if (!window.confirm("Delete this risk from the register?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/risks/${id}`);
      setRisks((prev) => {
        const next = prev.filter((r) => r.id !== id);
        setSelectedId(next[0]?.id ?? "");
        return next;
      });
      setMode("view");
      setMessage({ type: "success", text: "Risk deleted" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      setSaving(false);
    }
  }

  async function exportRegister() {
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob("/api/v1/risks/export", "risk-register.csv");
      downloadBlob(blob, filename);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  const formCard =
    mode === "add" || mode === "edit" ? (
      <Card elevated>
        <CardHeader title={mode === "add" ? "New risk" : "Edit risk"} />
        <CardBody className="space-y-3">
          <input
            className="comply-input w-full"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((n) => ({ ...n, title: e.target.value }))}
          />
          <textarea
            className="comply-input min-h-[80px] w-full"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((n) => ({ ...n, description: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-comply-text-secondary">Category</span>
              <select
                className="comply-input mt-1 w-full"
                value={form.category}
                onChange={(e) => setForm((n) => ({ ...n, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-comply-text-secondary">Owner</span>
              <select
                className="comply-input mt-1 w-full"
                value={form.ownerId}
                onChange={(e) => setForm((n) => ({ ...n, ownerId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-comply-text-secondary">Likelihood (1-3)</span>
              <input
                type="number"
                min={1}
                max={3}
                className="comply-input mt-1 w-full"
                value={form.likelihood}
                onChange={(e) =>
                  setForm((n) => ({ ...n, likelihood: Number(e.target.value) }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="text-comply-text-secondary">Impact (1-3)</span>
              <input
                type="number"
                min={1}
                max={3}
                className="comply-input mt-1 w-full"
                value={form.impact}
                onChange={(e) => setForm((n) => ({ ...n, impact: Number(e.target.value) }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-comply-text-secondary">Next review</span>
              <input
                type="date"
                className="comply-input mt-1 w-full"
                value={form.nextReviewAt}
                onChange={(e) => setForm((n) => ({ ...n, nextReviewAt: e.target.value }))}
              />
            </label>
          </div>
          <textarea
            className="comply-input min-h-[60px] w-full"
            placeholder="Mitigation plan"
            value={form.mitigation}
            onChange={(e) => setForm((n) => ({ ...n, mitigation: e.target.value }))}
          />
          <div className="flex gap-2">
            <ComplyButton
              variant="primary"
              disabled={saving}
              onClick={mode === "add" ? createRisk : saveEdit}
            >
              {saving ? "Saving…" : mode === "add" ? "Save risk" : "Save changes"}
            </ComplyButton>
            <ComplyButton
              variant="secondary"
              onClick={() => {
                setMode("view");
                setForm(EMPTY_FORM);
              }}
            >
              Cancel
            </ComplyButton>
          </div>
        </CardBody>
      </Card>
    ) : null;

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Risk"
        title="Risk register"
        description="Track organizational risks with likelihood × impact scores, owners, and mitigation plans."
      >
        <ComplyButton variant="primary" className="gap-1.5 text-sm" onClick={openAdd}>
          <IconPlus size={16} />
          Add risk
        </ComplyButton>
      </PageHeader>

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

      {formCard}

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-comply-purple/20 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20">
              <IconChartDots size={28} className="text-comply-purple-border" stroke={1.5} />
            </span>
            <div>
              <SectionLabel>Risk program</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-comply-text-primary">
                {risks.length} risks tracked
                {categories.length > 1 ? ` across ${categories.length - 1} categories` : ""}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Score = likelihood × impact (1-3 each). High priority starts at 6. Set owners and
                next review dates to keep the register current.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-comply-text-secondary">
            {[
              `${highScoreCount} high-priority risks (score 6+)`,
              `${openCount} open · ${mitigatingCount} mitigating`,
              `${dueSoonCount} reviews due within 30 days`,
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
        <StatCard label="Open" value={String(openCount)} accent="red" />
        <StatCard label="Mitigating" value={String(mitigatingCount)} accent="amber" />
        <StatCard
          label="Accepted"
          value={String(risks.filter((r) => r.status === "Accepted").length)}
          accent="purple"
        />
        <StatCard label="High score (6+)" value={String(highScoreCount)} accent="red" hint="priority" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card elevated>
          <CardHeader title="Risk matrix" />
          <CardBody>
            <p className="mb-3 text-xs text-comply-text-tertiary">Impact across, likelihood down</p>
            <div className="grid grid-cols-3 gap-1">
              {[...riskMatrixLabels.likelihood].reverse().map((lik, rowFromTop) => {
                const likelihood = 3 - rowFromTop;
                return riskMatrixLabels.impact.map((imp, col) => {
                  const impact = col + 1;
                  const cellRisks = risks.filter(
                    (r) => r.matrix.i === impact && r.matrix.l === likelihood
                  );
                  const hasHigh = cellRisks.some((r) => r.score >= 6);
                  return (
                    <button
                      key={`${lik}-${imp}`}
                      type="button"
                      title={`${lik} likelihood · ${imp} impact`}
                      className={cn(
                        "flex min-h-[52px] flex-col items-center justify-center rounded-sm border p-1 text-center",
                        cellRisks.length > 0
                          ? hasHigh
                            ? "border-comply-red/40 bg-comply-red/15"
                            : "border-comply-amber/30 bg-comply-amber/10"
                          : "border-white/[0.06] bg-black/20"
                      )}
                      onClick={() => {
                        if (cellRisks[0]) setSelectedId(cellRisks[0].id);
                      }}
                    >
                      {cellRisks.length > 0 ? (
                        <span className="font-mono text-xs font-semibold text-comply-text-primary">
                          {cellRisks.length}
                        </span>
                      ) : (
                        <span className="text-[10px] text-comply-muted">—</span>
                      )}
                    </button>
                  );
                });
              })}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-comply-text-tertiary">
              <span>Low impact</span>
              <span>High impact</span>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  category === c
                    ? "bg-comply-purple text-white"
                    : "border border-white/[0.08] text-comply-text-secondary hover:text-comply-text-primary"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <Card elevated>
            <CardBody className="p-0 pb-1">
              <DataTable>
                <thead>
                  <tr>
                    <th>Risk</th>
                    <th>Category</th>
                    <th>L × I</th>
                    <th>Score</th>
                    <th>Owner</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-comply-text-secondary">
                        No risks in this category yet.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          setMode("view");
                        }}
                        className={cn(
                          "cursor-pointer",
                          selected?.id === r.id && "bg-comply-purple/10"
                        )}
                      >
                        <td className="font-medium">{r.name}</td>
                        <td className="text-comply-text-secondary">{r.category}</td>
                        <td className="font-mono text-xs text-comply-text-secondary">
                          {r.matrix.l}/{r.matrix.i}
                        </td>
                        <td className={cn("font-mono font-semibold", riskScoreColor(r.score))}>
                          {r.score}
                        </td>
                        <td className="text-xs text-comply-text-secondary">{r.owner}</td>
                        <td>
                          <span className={cn("comply-badge normal-case", STATUS_STYLES[r.status])}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </CardBody>
          </Card>
        </div>
      </div>

      {selected && mode === "view" ? (
        <Card elevated>
          <CardHeader
            title={selected.name}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="comply-input text-xs"
                  value={selected.status}
                  disabled={saving}
                  onChange={(e) => updateStatus(selected.id, e.target.value as UiRisk["status"])}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ComplyButton variant="secondary" className="text-xs" onClick={() => openEdit(selected)}>
                  Edit
                </ComplyButton>
                <ComplyButton
                  variant="secondary"
                  className="gap-1 text-xs text-comply-red"
                  disabled={saving}
                  onClick={() => deleteRisk(selected.id)}
                >
                  <IconTrash size={14} />
                  Delete
                </ComplyButton>
              </div>
            }
          />
          <CardBody className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-comply-text-secondary">
                {selected.description || "No description."}
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Mitigation
                </p>
                <p className="mt-2 text-sm text-comply-text-primary">
                  {selected.mitigation || "No mitigation plan yet."}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Owner
                </dt>
                <dd className="mt-1 text-sm text-comply-text-primary">{selected.owner}</dd>
              </div>
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Next review
                </dt>
                <dd className="mt-1 text-sm text-comply-text-primary">
                  {formatDate(selected.nextReview)}
                </dd>
              </div>
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Likelihood
                </dt>
                <dd className="mt-1 text-sm text-comply-text-primary">{selected.likelihood}</dd>
              </div>
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Impact
                </dt>
                <dd className="mt-1 text-sm text-comply-text-primary">{selected.impact}</dd>
              </div>
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Category
                </dt>
                <dd className="mt-1 text-sm text-comply-text-primary">{selected.category}</dd>
              </div>
              <div className="marketing-panel p-4">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Score
                </dt>
                <dd className={cn("mt-1 font-mono text-sm font-semibold", riskScoreColor(selected.score))}>
                  {selected.score}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      ) : null}

      <div className="marketing-panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <IconShield size={20} className="mt-0.5 text-comply-purple-border" />
          <div>
            <p className="text-sm font-medium text-comply-text-primary">Export for auditor review</p>
            <p className="mt-1 text-xs text-comply-text-secondary">
              Download the full risk register as CSV (owners and admins).
            </p>
          </div>
        </div>
        <ComplyButton
          variant="secondary"
          className="gap-1.5 text-sm"
          disabled={exporting || risks.length === 0}
          onClick={exportRegister}
        >
          <IconAlertTriangle size={16} />
          {exporting ? "Exporting…" : "Export register"}
        </ComplyButton>
      </div>
    </div>
  );
}
