"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconCircleCheck,
  IconFilter,
  IconListCheck,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import { ControlStatusBadge } from "@/components/comply/status-badge";
import type { ControlRow, FrameworkRow, OrgInfo } from "@/lib/compliance-api";
import { mapControlStatus } from "@/lib/format";
import type { ControlStatus } from "@vikela/shared";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const API_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "NOT_STARTED", label: "Not started" },
] as const;

export function ControlsPageContent({
  controls,
  frameworks,
  org,
  initialFramework,
}: {
  controls: ControlRow[];
  frameworks: FrameworkRow[];
  org: OrgInfo;
  initialFramework?: string;
}) {
  const [query, setQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState(initialFramework ?? "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const enrolledFrameworks = frameworks.filter((f) => f.enrolled);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(controls.map((c) => c.category))).sort()],
    [controls]
  );

  const filtered = useMemo(() => {
    return controls.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchQuery =
        q === "" ||
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      const matchFramework =
        frameworkFilter === "all" ||
        c.frameworks.some((f) => f.slug === frameworkFilter);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchCategory = categoryFilter === "all" || c.category === categoryFilter;
      return matchQuery && matchFramework && matchStatus && matchCategory;
    });
  }, [controls, query, frameworkFilter, statusFilter, categoryFilter]);

  const implemented = controls.filter((c) => c.status === "IMPLEMENTED").length;
  const needsReview = controls.filter((c) => c.status === "NEEDS_REVIEW").length;
  const withGaps = controls.filter((c) => c.openGapCount > 0).length;
  const withEvidence = controls.filter((c) => c.evidenceCount > 0).length;

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Compliance"
        title="Controls"
        description="Every framework your customers ask for, mapped to controls with live evidence and gap status from your stack."
      />

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-comply-purple/25 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20 shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]">
              <IconListCheck size={28} className="text-comply-purple-border" stroke={1.5} />
            </span>
            <div>
              <SectionLabel>Control library</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-comply-text-primary">
                {controls.length} controls for {org.name}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Vikela maps findings from code, cloud, and identity into{" "}
                {enrolledFrameworks.length > 0
                  ? enrolledFrameworks.map((f) => f.name).join(", ")
                  : "Enable frameworks on your dashboard to start tracking controls"}
                . Status and evidence reflect your connected integrations and scans.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-comply-text-secondary lg:min-w-[200px]">
            {[
              `${implemented} implemented`,
              `${withEvidence} with evidence on file`,
              `${withGaps} with open gaps`,
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <IconCircleCheck size={16} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
                {line}
              </li>
            ))}
          </ul>
        </div>
        {enrolledFrameworks.length > 0 && (
          <div className="relative mt-6 flex flex-wrap gap-2 border-t border-white/[0.06] pt-6">
            {enrolledFrameworks.map((fw) => (
              <button
                key={fw.id}
                type="button"
                onClick={() => setFrameworkFilter(fw.slug)}
                className={cn(
                  "rounded-sm border px-2 py-0.5 font-mono text-[10px] transition-colors",
                  frameworkFilter === fw.slug
                    ? "border-comply-purple-border/50 bg-comply-purple/15 text-comply-purple-light"
                    : "border-white/[0.08] bg-white/[0.04] text-comply-text-secondary hover:border-comply-purple-border/30"
                )}
              >
                {fw.name}
                {fw.score > 0 ? ` · ${fw.score}%` : ""}
              </button>
            ))}
            {frameworkFilter !== "all" && (
              <button
                type="button"
                onClick={() => setFrameworkFilter("all")}
                className="text-[10px] text-comply-purple-border hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total controls" value={String(controls.length)} accent="purple" />
        <StatCard label="Implemented" value={String(implemented)} accent="green" />
        <StatCard label="Needs review" value={String(needsReview)} accent="amber" />
        <StatCard label="With open gaps" value={String(withGaps)} accent="red" />
      </div>

      <Card elevated>
        <CardHeader
          title={`Controls (${filtered.length})`}
          action={
            <span className="inline-flex items-center gap-1 text-xs text-comply-text-tertiary">
              <IconFilter size={14} />
              Filter
            </span>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-[200px] flex-1">
              <IconSearch
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-comply-muted"
              />
              <input
                type="search"
                placeholder="Search by ID, name, or category…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="comply-input w-full pl-8"
              />
            </div>
            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              className="comply-input min-w-[160px]"
            >
              <option value="all">All frameworks</option>
              {enrolledFrameworks.map((fw) => (
                <option key={fw.id} value={fw.slug}>
                  {fw.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="comply-input min-w-[140px]"
            >
              {API_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="comply-input min-w-[160px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat === "All" ? "all" : cat}>
                  {cat === "All" ? "All categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="comply-empty border-0 bg-transparent py-12">
              <IconShieldCheck size={32} className="text-comply-purple-border opacity-60" />
              <p className="mt-3 text-sm text-comply-text-secondary">
                No controls match your filters.
              </p>
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <th>Control ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Framework(s)</th>
                  <th>Status</th>
                  <th>Evidence</th>
                  <th>Gaps</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/controls/${c.code}`}
                        className="font-mono text-sm font-medium text-comply-purple-border hover:text-comply-purple-light"
                      >
                        {c.code}
                      </Link>
                    </td>
                    <td className="max-w-[220px]">
                      <p className="font-medium text-comply-text-primary">{c.title}</p>
                    </td>
                    <td className="text-sm text-comply-text-secondary">{c.category}</td>
                    <td className="max-w-[160px] text-sm text-comply-text-secondary">
                      {c.frameworks.map((f) => f.name).join(", ") || "—"}
                    </td>
                    <td>
                      <ControlStatusBadge
                        status={mapControlStatus(
                          c.status as ControlStatus,
                          c.openGapCount > 0
                        )}
                      />
                    </td>
                    <td className="font-mono text-sm text-comply-text-secondary">
                      {c.evidenceCount}
                    </td>
                    <td>
                      {c.openGapCount > 0 ? (
                        <Link
                          href={`/gaps?control=${encodeURIComponent(c.code)}`}
                          className="font-mono text-sm font-medium text-comply-red hover:underline"
                        >
                          {c.openGapCount}
                        </Link>
                      ) : (
                        <span className="text-comply-text-tertiary">0</span>
                      )}
                    </td>
                    <td className="text-sm text-comply-text-secondary">
                      {c.updatedAt
                        ? new Date(c.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
