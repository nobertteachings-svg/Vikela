"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { apiPost } from "@/lib/api";
import {
  IconBuildingStore,
  IconCircleCheck,
  IconFileCertificate,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import type { VendorRow } from "@/lib/compliance-api";
import { mapVendorRow } from "@/lib/ui-mappers";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { StatCard } from "@/components/comply/stat-card";
import type { VendorStatus } from "@/lib/product-config";
import type { UiVendor } from "@/lib/ui-mappers";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const STATUS_STYLES: Record<VendorStatus, string> = {
  Approved: "border-comply-green/30 bg-comply-green/10 text-comply-green",
  "Review needed": "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  "Not reviewed": "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary",
  Rejected: "border-comply-red/30 bg-comply-red/10 text-comply-red",
};

const RISK_STYLES: Record<string, string> = {
  Low: "text-comply-green-text",
  Medium: "text-comply-amber-text",
  High: "text-comply-red",
  Critical: "text-comply-red font-semibold",
};

function formatReviewDate(value: string | null | undefined): string {
  if (!value || value === "—") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function renewingWithinDays(vendors: UiVendor[], days: number): number {
  const now = Date.now();
  const horizon = now + days * 24 * 60 * 60 * 1000;
  return vendors.filter((v) => {
    if (!v.contractRenewalIso) return false;
    const t = new Date(v.contractRenewalIso).getTime();
    return !Number.isNaN(t) && t >= now && t <= horizon;
  }).length;
}

export function VendorsPageContent({ vendors: initialVendors }: { vendors: UiVendor[] }) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "All">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [form, setForm] = useState({
    name: "",
    category: "SaaS",
    website: "",
    owner: "",
    dataAccess: "",
    riskLevel: "MEDIUM",
    contractRenewal: "",
    soc2Certified: false,
    dataProcessing: false,
  });

  useEffect(() => {
    setVendors(initialVendors);
  }, [initialVendors]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchQuery =
        query === "" ||
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.category.toLowerCase().includes(query.toLowerCase());
      const matchStatus = statusFilter === "All" || v.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [query, statusFilter, vendors]);

  const approved = vendors.filter((v) => v.status === "Approved").length;
  const needsReview = vendors.filter(
    (v) => v.status === "Review needed" || v.status === "Not reviewed"
  ).length;
  const soc2Count = vendors.filter((v) => v.soc2).length;
  const renewing90 = renewingWithinDays(vendors, 90);

  async function createVendor() {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const row = await apiPost<VendorRow>("/api/v1/vendors", {
        ...form,
        contractRenewal: form.contractRenewal || null,
      });
      setVendors((prev) =>
        [...prev, mapVendorRow(row)].sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowAdd(false);
      setForm({
        name: "",
        category: "SaaS",
        website: "",
        owner: "",
        dataAccess: "",
        riskLevel: "MEDIUM",
        contractRenewal: "",
        soc2Certified: false,
        dataProcessing: false,
      });
      setMessage({ type: "success", text: "Vendor added" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to add vendor" });
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob("/api/v1/vendors/export", "vendors.csv");
      downloadBlob(blob, filename);
      setMessage({ type: "success", text: "Vendor inventory exported" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Third party"
        title="Vendors"
        description="Third-party risk inventory, SOC 2 coverage, questionnaires, and contract renewals."
      >
        <div className="flex flex-wrap gap-2">
          <ComplyButton
            variant="secondary"
            className="text-sm"
            disabled={exporting}
            onClick={() => void exportCsv()}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </ComplyButton>
          <ComplyButton
            variant="primary"
            className="gap-1.5 text-sm"
            onClick={() => setShowAdd(true)}
          >
            <IconPlus size={16} />
            Add vendor
          </ComplyButton>
        </div>
      </PageHeader>

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

      {showAdd ? (
        <Card elevated>
          <CardHeader title="New vendor" />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="comply-input w-full"
                placeholder="Vendor name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="comply-input w-full"
                placeholder="Category (e.g. Cloud, Payments)"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              <input
                className="comply-input w-full"
                placeholder="Website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
              <input
                className="comply-input w-full"
                placeholder="Owner"
                value={form.owner}
                onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              />
              <input
                className="comply-input w-full sm:col-span-2"
                placeholder="Data access summary"
                value={form.dataAccess}
                onChange={(e) => setForm((f) => ({ ...f, dataAccess: e.target.value }))}
              />
              <select
                className="comply-input"
                value={form.riskLevel}
                onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}
              >
                <option value="LOW">Low risk</option>
                <option value="MEDIUM">Medium risk</option>
                <option value="HIGH">High risk</option>
                <option value="CRITICAL">Critical risk</option>
              </select>
              <input
                type="date"
                className="comply-input"
                value={form.contractRenewal}
                onChange={(e) => setForm((f) => ({ ...f, contractRenewal: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-comply-text-secondary">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.soc2Certified}
                  onChange={(e) => setForm((f) => ({ ...f, soc2Certified: e.target.checked }))}
                />
                SOC 2 on file
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.dataProcessing}
                  onChange={(e) => setForm((f) => ({ ...f, dataProcessing: e.target.checked }))}
                />
                Processes customer data
              </label>
            </div>
            <div className="flex gap-2">
              <ComplyButton variant="primary" disabled={saving} onClick={() => void createVendor()}>
                {saving ? "Saving…" : "Save vendor"}
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
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-comply-green/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20">
              <IconBuildingStore size={28} className="text-comply-purple-border" stroke={1.5} />
            </span>
            <div>
              <SectionLabel>Vendor management</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-comply-text-primary">
                {vendors.length} vendors · {soc2Count} with SOC 2 on file
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Track data access, security reviews, and questionnaires. Vendors that process
                customer data without SOC 2 should complete a questionnaire before approval.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-comply-text-secondary">
            {[
              `${needsReview} vendors need review`,
              `${renewing90} contract${renewing90 === 1 ? "" : "s"} renewing in next 90 days`,
              "Run per-vendor questionnaires from the detail page",
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
        <StatCard label="Approved" value={String(approved)} accent="green" />
        <StatCard label="Needs review" value={String(needsReview)} accent="amber" />
        <StatCard label="SOC 2 on file" value={String(soc2Count)} accent="purple" />
        <StatCard
          label="Medium+ risk"
          value={String(vendors.filter((v) => v.risk !== "Low").length)}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {vendors
          .filter((v) => v.status !== "Approved")
          .map((v) => (
            <Link
              key={v.id}
              href={`/vendors/${v.id}`}
              className="marketing-panel group relative block p-5 transition-all hover:border-comply-purple-border/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-comply-text-primary group-hover:text-comply-purple-border">
                    {v.name}
                  </p>
                  <p className="text-xs text-comply-text-secondary">{v.category}</p>
                </div>
                <span className={cn("comply-badge normal-case text-[10px]", STATUS_STYLES[v.status])}>
                  {v.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-comply-muted">
                {v.risk} risk · {v.dataAccess}
              </p>
              <p className="mt-2 text-xs text-comply-purple-border">Review vendor</p>
            </Link>
          ))}
      </div>

      <Card elevated>
        <CardHeader
          title="All vendors"
          action={
            <div className="relative">
              <IconSearch
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-comply-muted"
              />
              <input
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-40 rounded-md border border-white/[0.1] bg-black/30 pl-8 pr-2 text-xs text-comply-text-primary placeholder:text-comply-muted focus:outline-none focus:ring-1 focus:ring-comply-purple/40"
              />
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              ["All", "Approved", "Review needed", "Not reviewed", "Rejected"] as const
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? "bg-comply-purple text-white"
                    : "text-comply-text-secondary hover:bg-white/[0.04]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <DataTable>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Category</th>
                <th>Data access</th>
                <th>Risk</th>
                <th>SOC 2</th>
                <th>Last review</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link
                      href={`/vendors/${v.id}`}
                      className="font-medium text-comply-text-primary hover:text-comply-purple-border"
                    >
                      {v.name}
                    </Link>
                    <p className="text-[10px] text-comply-text-tertiary">{v.owner}</p>
                  </td>
                  <td className="text-comply-text-secondary">{v.category}</td>
                  <td className="max-w-[140px] truncate text-xs text-comply-text-secondary">
                    {v.dataAccess}
                  </td>
                  <td className={cn("font-medium", RISK_STYLES[v.risk])}>{v.risk}</td>
                  <td>
                    {v.soc2 ? (
                      <IconFileCertificate size={16} className="text-comply-green" />
                    ) : (
                      <span className="text-xs text-comply-muted">—</span>
                    )}
                  </td>
                  <td className="text-comply-text-secondary">{formatReviewDate(v.lastReview)}</td>
                  <td>
                    <span
                      className={cn("comply-badge normal-case text-[10px]", STATUS_STYLES[v.status])}
                    >
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </div>
  );
}
