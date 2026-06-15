"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { apiPatch, apiPost } from "@/lib/api";
import {
  IconAlertTriangle,
  IconChartDots,
  IconCircleCheck,
  IconPlus,
  IconShield,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { riskMatrixLabels, type RiskStatus } from "@/lib/mock-data";
import type { UiRisk } from "@/lib/ui-mappers";
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

function riskScoreColor(score: number) {
  if (score >= 12) return "text-comply-red";
  if (score >= 8) return "text-comply-amber-text";
  return "text-comply-green-text";
}

const STATUS_OPTIONS: UiRisk["status"][] = ["Open", "Mitigating", "Accepted", "Closed"];

function statusToApi(status: UiRisk["status"]): string {
  if (status === "Mitigating") return "MITIGATED";
  if (status === "Accepted") return "ACCEPTED";
  if (status === "Closed") return "CLOSED";
  return "OPEN";
}

export function RisksPageContent({ risks: initialRisks }: { risks: UiRisk[] }) {
  const router = useRouter();
  const [risks, setRisks] = useState(initialRisks);
  const categories = ["All", ...Array.from(new Set(risks.map((r) => r.category)))];
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState(risks[0]?.id ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newRisk, setNewRisk] = useState({
    title: "",
    description: "",
    likelihood: 2,
    impact: 2,
    mitigation: "",
  });

  const filtered = useMemo(
    () => (category === "All" ? risks : risks.filter((r) => r.category === category)),
    [category, risks]
  );

  const selected = risks.find((r) => r.id === selectedId) ?? filtered[0];

  const openCount = risks.filter((r) => r.status === "Open").length;
  const mitigatingCount = risks.filter((r) => r.status === "Mitigating").length;
  const highScoreCount = risks.filter((r) => r.score >= 12).length;

  async function createRisk() {
    if (!newRisk.title.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const row = await apiPost<{
        id: string;
        title: string;
        description: string;
        likelihood: number;
        impact: number;
        score: number;
        status: string;
        mitigation: string | null;
        updatedAt: string;
      }>("/api/v1/risks", newRisk);
      const ui: UiRisk = {
        id: row.id,
        name: row.title,
        category: "Operational",
        likelihood: row.likelihood === 1 ? "Low" : row.likelihood === 2 ? "Medium" : "High",
        impact: row.impact === 1 ? "Low" : row.impact === 2 ? "Medium" : "High",
        score: row.score,
        owner: "—",
        mitigation: row.mitigation ?? "",
        status: "Open",
        matrix: { l: row.likelihood, i: row.impact },
        description: row.description,
        nextReview: row.updatedAt,
        controls: [],
      };
      setRisks((prev) => [ui, ...prev]);
      setSelectedId(ui.id);
      setShowAdd(false);
      setNewRisk({ title: "", description: "", likelihood: 2, impact: 2, mitigation: "" });
      setMessage({ type: "success", text: "Risk added" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to add risk" });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: UiRisk["status"]) {
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/risks/${id}`, { status: statusToApi(status) });
      setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setMessage({ type: "success", text: "Status updated" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
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

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Risk"
        title="Risk register"
        description="Track organizational risks, likelihood × impact scores, and mitigation plans mapped to controls."
      >
        <ComplyButton variant="primary" className="gap-1.5 text-sm" onClick={() => setShowAdd(true)}>
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

      {showAdd ? (
        <Card elevated>
          <CardHeader title="New risk" />
          <CardBody className="space-y-3">
            <input
              className="comply-input w-full"
              placeholder="Title"
              value={newRisk.title}
              onChange={(e) => setNewRisk((n) => ({ ...n, title: e.target.value }))}
            />
            <textarea
              className="comply-input min-h-[80px] w-full"
              placeholder="Description"
              value={newRisk.description}
              onChange={(e) => setNewRisk((n) => ({ ...n, description: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-comply-text-secondary">Likelihood (1–3)</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  className="comply-input mt-1 w-full"
                  value={newRisk.likelihood}
                  onChange={(e) =>
                    setNewRisk((n) => ({ ...n, likelihood: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-comply-text-secondary">Impact (1–3)</span>
                <input
                  type="number"
                  min={1}
                  max={3}
                  className="comply-input mt-1 w-full"
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk((n) => ({ ...n, impact: Number(e.target.value) }))}
                />
              </label>
            </div>
            <textarea
              className="comply-input min-h-[60px] w-full"
              placeholder="Mitigation plan"
              value={newRisk.mitigation}
              onChange={(e) => setNewRisk((n) => ({ ...n, mitigation: e.target.value }))}
            />
            <div className="flex gap-2">
              <ComplyButton variant="primary" disabled={saving} onClick={createRisk}>
                {saving ? "Saving…" : "Save risk"}
              </ComplyButton>
              <ComplyButton variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </ComplyButton>
            </div>
          </CardBody>
        </Card>
      ) : null}

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
                {risks.length} risks tracked across {categories.length - 1} categories
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Risks link to SOC 2, HIPAA, and ISO controls. Review quarterly or when posture score
                drops below 70.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-comply-text-secondary">
            {[
              `${highScoreCount} risks scored 12+ (high priority)`,
              "Next board review: May 28, 2025",
              "Mapped to 8 unique controls",
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
        <StatCard label="Accepted" value={String(risks.filter((r) => r.status === "Accepted").length)} accent="purple" />
        <StatCard label="High score (12+)" value={String(highScoreCount)} accent="red" hint="priority" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        {/* Risk matrix */}
        <Card elevated>
          <CardHeader title="Risk matrix" />
          <CardBody>
            <p className="mb-3 text-xs text-comply-text-tertiary">Impact → · Likelihood ↓</p>
            <div className="grid grid-cols-3 gap-1">
              {riskMatrixLabels.impact.map((imp, col) =>
                riskMatrixLabels.likelihood.map((lik, row) => {
                  const cellRisks = risks.filter(
                    (r) => r.matrix.i === col + 1 && r.matrix.l === row + 1
                  );
                  const hasHigh = cellRisks.some((r) => r.score >= 12);
                  return (
                    <div
                      key={`${lik}-${imp}`}
                      className={cn(
                        "flex min-h-[52px] flex-col items-center justify-center rounded-sm border p-1 text-center",
                        cellRisks.length > 0
                          ? hasHigh
                            ? "border-comply-red/40 bg-comply-red/15"
                            : "border-comply-amber/30 bg-comply-amber/10"
                          : "border-white/[0.06] bg-black/20"
                      )}
                    >
                      {cellRisks.length > 0 ? (
                        <span className="font-mono text-xs font-semibold text-comply-text-primary">
                          {cellRisks.length}
                        </span>
                      ) : (
                        <span className="text-[10px] text-comply-muted">—</span>
                      )}
                    </div>
                  );
                })
              )}
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
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "cursor-pointer",
                        selected?.id === r.id && "bg-comply-purple/10"
                      )}
                    >
                      <td className="font-medium">{r.name}</td>
                      <td className="text-comply-text-secondary">{r.category}</td>
                      <td className="font-mono text-xs text-comply-text-secondary">
                        {r.likelihood[0]}/{r.impact[0]}
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
                  ))}
                </tbody>
              </DataTable>
            </CardBody>
          </Card>
        </div>
      </div>

      {selected && (
        <Card elevated>
          <CardHeader
            title={selected.name}
            action={
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
            }
          />
          <CardBody className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-comply-text-secondary">{selected.description}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Mitigation
                </p>
                <p className="mt-2 text-sm text-comply-text-primary">{selected.mitigation}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.controls.map((c) => (
                  <span
                    key={c}
                    className="rounded-sm border border-comply-purple-border/30 bg-comply-purple/10 px-2 py-0.5 font-mono text-[10px] text-comply-purple-border"
                  >
                    {c}
                  </span>
                ))}
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
                  {new Date(selected.nextReview).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
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
            </dl>
          </CardBody>
        </Card>
      )}

      <div className="marketing-panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <IconShield size={20} className="mt-0.5 text-comply-purple-border" />
          <div>
            <p className="text-sm font-medium text-comply-text-primary">Export for auditor review</p>
            <p className="mt-1 text-xs text-comply-text-secondary">
              Download risk register as CSV or include in your evidence package.
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
