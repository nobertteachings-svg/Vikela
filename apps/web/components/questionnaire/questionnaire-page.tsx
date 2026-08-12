"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconCheck,
  IconClipboardList,
  IconDownload,
  IconPlus,
  IconCircleCheck,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { ComplyButton } from "@/components/comply/button";
import { apiPatch, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

export type QuestionnaireItem = {
  id: string;
  q: string;
  category?: string;
  suggestedAnswer?: string;
  answer: string;
  status: string;
  sortOrder?: number;
};

export type QuestionnaireData = {
  id: string;
  title: string;
  status: string;
  vendorId?: string | null;
  itemCount?: number;
  approvedCount?: number;
  progressPercent?: number;
  items: QuestionnaireItem[];
  createdAt?: string;
  updatedAt?: string;
};

const STATUS_OPTIONS = ["Pending", "Approved", "Needs edit", "Skip"] as const;

const STATUS_STYLE: Record<string, string> = {
  Pending: "border-comply-border bg-comply-surface text-comply-text-secondary",
  Approved: "border-comply-green/30 bg-comply-green/10 text-comply-green",
  "Needs edit": "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  Edit: "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  Skip: "border-comply-border bg-comply-surface text-comply-text-muted",
};

function normalizeStatus(s: string): string {
  if (s === "Edit") return "Needs edit";
  return s;
}

function isSettled(status: string): boolean {
  const s = normalizeStatus(status);
  return s === "Approved" || s === "Skip";
}

function progressOf(q: QuestionnaireData): number {
  if (typeof q.progressPercent === "number") return q.progressPercent;
  if (!q.items.length) return 0;
  const done = q.items.filter((i) => isSettled(i.status)).length;
  return Math.round((done / q.items.length) * 100);
}

function statusLabel(status: string): string {
  if (status === "COMPLETE") return "Complete";
  if (status === "IN_REVIEW") return "In review";
  if (status === "DRAFT") return "Draft";
  return status;
}

export function QuestionnairePageContent({
  initial,
  list: initialList = [],
  vendorId,
  vendorName,
}: {
  initial: QuestionnaireData | null;
  list?: QuestionnaireData[];
  vendorId?: string | null;
  vendorName?: string | null;
}) {
  const [data, setData] = useState<QuestionnaireData | null>(
    initial
      ? {
          ...initial,
          items: initial.items.map((i) => ({
            ...i,
            status: normalizeStatus(i.status),
            category: i.category || "General",
          })),
        }
      : null
  );
  const [list, setList] = useState(initialList);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const categories = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set(data.items.map((i) => i.category || "General"));
    return Array.from(set);
  }, [data]);

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ category: string; items: QuestionnaireItem[] }>;
    const map = new Map<string, QuestionnaireItem[]>();
    for (const item of data.items) {
      const cat = item.category || "General";
      if (filterCategory !== "All" && cat !== filterCategory) continue;
      const arr = map.get(cat) ?? [];
      arr.push(item);
      map.set(cat, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [data, filterCategory]);

  const progress = data ? progressOf(data) : 0;
  const remaining = data
    ? data.items.filter((i) => !isSettled(i.status)).length
    : 0;
  const isComplete = data?.status === "COMPLETE";

  function upsertList(next: QuestionnaireData) {
    setList((prev) => {
      const others = prev.filter((q) => q.id !== next.id);
      return [next, ...others];
    });
  }

  async function startQuestionnaire(forceNew = false) {
    setLoading(true);
    setMessage(null);
    try {
      const created = await apiPost<QuestionnaireData>(
        vendorId
          ? `/api/v1/vendors/${vendorId}/questionnaire`
          : "/api/v1/questionnaires",
        vendorId
          ? {}
          : {
              title: "Security questionnaire",
              forceNew,
            }
      );
      const normalized: QuestionnaireData = {
        ...created,
        items: (created.items ?? []).map((i) => ({
          ...i,
          status: normalizeStatus(i.status),
          category: i.category || "General",
        })),
      };
      setData(normalized);
      upsertList(normalized);
      if (forceNew) {
        const url = new URL(window.location.href);
        url.searchParams.set("qid", normalized.id);
        if (vendorId) url.searchParams.set("vendorId", vendorId);
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start questionnaire");
    } finally {
      setLoading(false);
    }
  }

  async function startFresh() {
    if (
      !window.confirm(
        "Start a new questionnaire with the full production question bank? Your current one stays in the list."
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const created = await apiPost<QuestionnaireData>("/api/v1/questionnaires", {
        title: vendorName
          ? `${vendorName} security questionnaire`
          : "Security questionnaire",
        vendorId: vendorId || undefined,
        forceNew: true,
      });
      const normalized: QuestionnaireData = {
        ...created,
        items: (created.items ?? []).map((i) => ({
          ...i,
          status: normalizeStatus(i.status),
          category: i.category || "General",
        })),
      };
      setData(normalized);
      upsertList(normalized);
      const url = new URL(window.location.href);
      url.searchParams.set("qid", normalized.id);
      if (vendorId) url.searchParams.set("vendorId", vendorId);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not create questionnaire");
    } finally {
      setLoading(false);
    }
  }

  async function selectQuestionnaire(id: string) {
    const found = list.find((q) => q.id === id);
    if (!found) return;
    setData({
      ...found,
      items: found.items.map((i) => ({
        ...i,
        status: normalizeStatus(i.status),
        category: i.category || "General",
      })),
    });
    setFilterCategory("All");
    const url = new URL(window.location.href);
    url.searchParams.set("qid", id);
    if (vendorId) url.searchParams.set("vendorId", vendorId);
    window.history.replaceState({}, "", url.toString());
  }

  async function updateItem(
    itemId: string,
    patch: { answer?: string; status?: string }
  ) {
    if (!data) return;
    const current = data.items.find((i) => i.id === itemId);
    if (!current) return;

    const answer = patch.answer ?? current.answer;
    const status = normalizeStatus(patch.status ?? current.status);

    setSavingId(itemId);
    setMessage(null);
    try {
      const updated = await apiPatch<QuestionnaireItem>(
        `/api/v1/questionnaires/${data.id}/items/${itemId}`,
        { answer, status }
      );
      const nextItems = data.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              answer: updated.answer ?? answer,
              status: normalizeStatus(updated.status ?? status),
              category: updated.category || i.category || "General",
            }
          : i
      );
      const approvedCount = nextItems.filter((i) => isSettled(i.status)).length;
      const next: QuestionnaireData = {
        ...data,
        items: nextItems,
        approvedCount,
        progressPercent: nextItems.length
          ? Math.round((approvedCount / nextItems.length) * 100)
          : 0,
        status:
          approvedCount === nextItems.length && nextItems.length > 0
            ? "COMPLETE"
            : approvedCount > 0
              ? "IN_REVIEW"
              : data.status,
      };
      setData(next);
      upsertList(next);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function approveAll() {
    if (!data) return;
    setLoading(true);
    setMessage(null);
    try {
      const refreshed = await apiPost<QuestionnaireData>(
        `/api/v1/questionnaires/${data.id}/approve-all`,
        {}
      );
      const next: QuestionnaireData = {
        ...refreshed,
        items: refreshed.items.map((i) => ({
          ...i,
          status: normalizeStatus(i.status),
          category: i.category || "General",
        })),
      };
      setData(next);
      upsertList(next);
      setMessage("All answers approved");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Approve all failed");
    } finally {
      setLoading(false);
    }
  }

  async function markComplete() {
    if (!data) return;
    setLoading(true);
    setMessage(null);
    try {
      const refreshed = await apiPost<QuestionnaireData>(
        `/api/v1/questionnaires/${data.id}/complete`,
        {}
      );
      const next: QuestionnaireData = {
        ...refreshed,
        items: refreshed.items.map((i) => ({
          ...i,
          status: normalizeStatus(i.status),
          category: i.category || "General",
        })),
      };
      setData(next);
      upsertList(next);
      setMessage("Questionnaire marked complete");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not complete");
    } finally {
      setLoading(false);
    }
  }

  function exportAnswers() {
    if (!data) return;
    const lines = [
      "category,question,answer,status",
      ...data.items.map(
        (i) =>
          `"${(i.category || "General").replace(/"/g, '""')}","${i.q.replace(/"/g, '""')}","${i.answer.replace(/"/g, '""')}",${normalizeStatus(i.status)}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title.replace(/\s+/g, "-").toLowerCase()}-answers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const title = vendorName
    ? `${vendorName} questionnaire`
    : data?.title ?? "Security questionnaire";

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Audit"
        title={title}
        description={
          vendorId
            ? "Vendor security assessment — review answers by category, approve or skip each item, then mark complete."
            : "Production vendor security questionnaire — governance, IAM, data protection, incident response, privacy, and subprocessors."
        }
      >
        {vendorId ? (
          <Link href={`/vendors/${vendorId}`} className="comply-btn-secondary text-sm">
            Back to vendor
          </Link>
        ) : null}
      </PageHeader>

      {message ? (
        <p className="text-sm text-comply-text-secondary" role="status">
          {message}
        </p>
      ) : null}

      {!data ? (
        <button
          type="button"
          onClick={() => void startQuestionnaire(false)}
          disabled={loading}
          className="comply-empty w-full cursor-pointer transition-colors hover:border-comply-purple-border hover:bg-comply-purple/5"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-comply-purple/15 text-comply-purple-border">
            <IconClipboardList size={24} />
          </span>
          <p className="text-sm font-medium text-comply-text-primary">
            {loading ? "Starting…" : "Start security questionnaire"}
          </p>
          <p className="mt-1 max-w-lg text-sm text-comply-text-secondary">
            Creates 30 production questions across security governance, access, encryption,
            vulnerability management, incident response, privacy, and subprocessors — with
            editable suggested answers.
          </p>
        </button>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {list.length > 1 ? (
            <aside className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
                Assessments
              </p>
              <ul className="space-y-1">
                {list.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => void selectQuestionnaire(q.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        q.id === data.id
                          ? "border-comply-purple-border/40 bg-comply-purple/10 text-comply-text-primary"
                          : "border-transparent hover:bg-comply-surface text-comply-text-secondary"
                      )}
                    >
                      <span className="line-clamp-2 font-medium">{q.title}</span>
                      <span className="mt-0.5 block text-xs text-comply-text-muted">
                        {statusLabel(q.status)} · {progressOf(q)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          <div className={cn("space-y-4", list.length <= 1 && "lg:col-span-2")}>
            <Card>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "comply-badge border",
                        isComplete
                          ? "border-comply-green/30 bg-comply-green/10 text-comply-green"
                          : "border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border"
                      )}
                    >
                      {statusLabel(data.status)}
                    </span>
                    <span className="text-sm text-comply-text-secondary">
                      {data.approvedCount ?? data.items.filter((i) => isSettled(i.status)).length}
                      /{data.items.length} settled
                      {remaining > 0 ? ` · ${remaining} remaining` : ""}
                    </span>
                  </div>
                  <div className="comply-progress-track max-w-md">
                    <div
                      className="comply-progress-bar"
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <p className="text-xs text-comply-text-muted">{progress}% complete</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ComplyButton
                    type="button"
                    variant="primary"
                    className="inline-flex items-center gap-1.5"
                    disabled={loading || isComplete}
                    onClick={() => void approveAll()}
                  >
                    <IconCheck size={16} />
                    Approve all
                  </ComplyButton>
                  <ComplyButton
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                    disabled={loading || isComplete || remaining > 0}
                    onClick={() => void markComplete()}
                  >
                    <IconCircleCheck size={16} />
                    Mark complete
                  </ComplyButton>
                  <ComplyButton
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                    onClick={exportAnswers}
                  >
                    <IconDownload size={16} />
                    Export CSV
                  </ComplyButton>
                  <ComplyButton
                    type="button"
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                    disabled={loading}
                    onClick={() => void startFresh()}
                  >
                    <IconPlus size={16} />
                    New assessment
                  </ComplyButton>
                </div>
              </CardBody>
            </Card>

            {categories.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterCategory("All")}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    filterCategory === "All"
                      ? "border-comply-purple-border/40 bg-comply-purple/10 text-comply-text-primary"
                      : "border-comply-border text-comply-text-secondary hover:bg-comply-surface"
                  )}
                >
                  All ({data.items.length})
                </button>
                {categories.map((cat) => {
                  const count = data.items.filter((i) => (i.category || "General") === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        filterCategory === cat
                          ? "border-comply-purple-border/40 bg-comply-purple/10 text-comply-text-primary"
                          : "border-comply-border text-comply-text-secondary hover:bg-comply-surface"
                      )}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            ) : null}

            {grouped.map(({ category, items }) => (
              <Card key={category}>
                <CardHeader title={category} />
                <CardBody className="space-y-6 pt-0">
                  {items.map((row, idx) => (
                    <div
                      key={row.id}
                      className="border-t border-comply-border pt-5 first:border-t-0 first:pt-0"
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-comply-text-primary">
                          <span className="mr-2 text-comply-text-muted">
                            {idx + 1}.
                          </span>
                          {row.q}
                        </p>
                        <span
                          className={cn(
                            "comply-badge shrink-0 border text-xs",
                            STATUS_STYLE[normalizeStatus(row.status)] ?? STATUS_STYLE.Pending
                          )}
                        >
                          {normalizeStatus(row.status)}
                          {savingId === row.id ? " · saving…" : ""}
                        </span>
                      </div>
                      {row.suggestedAnswer ? (
                        <p className="mb-2 text-xs text-comply-text-muted">
                          Suggested: {row.suggestedAnswer}
                        </p>
                      ) : null}
                      <textarea
                        value={row.answer}
                        rows={3}
                        disabled={isComplete}
                        className="comply-input min-h-[80px] w-full resize-y"
                        onChange={(e) => {
                          const value = e.target.value;
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  items: prev.items.map((i) =>
                                    i.id === row.id ? { ...i, answer: value } : i
                                  ),
                                }
                              : prev
                          );
                        }}
                        onBlur={(e) =>
                          void updateItem(row.id, { answer: e.target.value })
                        }
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="text-xs text-comply-text-muted" htmlFor={`status-${row.id}`}>
                          Status
                        </label>
                        <select
                          id={`status-${row.id}`}
                          value={normalizeStatus(row.status)}
                          disabled={isComplete}
                          className="comply-input max-w-xs py-1.5 text-sm"
                          onChange={(e) =>
                            void updateItem(row.id, { status: e.target.value })
                          }
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
