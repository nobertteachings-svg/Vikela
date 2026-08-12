"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/api";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";

type VendorEditValues = {
  name: string;
  category: string;
  website: string;
  owner: string;
  dataAccess: string;
  riskLevel: string;
  notes: string;
  contractRenewal: string;
  dataProcessing: boolean;
  soc2Certified: boolean;
  documents: string[];
  subprocessors: string[];
};

export function VendorEditForm({
  vendorId,
  initial,
}: {
  vendorId: string;
  initial: VendorEditValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [docInput, setDocInput] = useState("");
  const [subInput, setSubInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/vendors/${vendorId}`, {
        name: form.name,
        category: form.category,
        website: form.website || null,
        owner: form.owner || null,
        dataAccess: form.dataAccess || null,
        riskLevel: form.riskLevel,
        notes: form.notes || null,
        contractRenewal: form.contractRenewal || null,
        dataProcessing: form.dataProcessing,
        soc2Certified: form.soc2Certified,
        documents: form.documents,
        subprocessors: form.subprocessors,
      });
      setMessage("Vendor updated");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card elevated>
      <CardHeader title="Edit vendor" />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="comply-input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="comply-input"
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <input
            className="comply-input"
            placeholder="Website"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <input
            className="comply-input"
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
          <input
            className="comply-input sm:col-span-2"
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
        <textarea
          className="comply-input min-h-[72px]"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
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

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
            Documents (labels or links)
          </p>
          <div className="flex gap-2">
            <input
              className="comply-input"
              placeholder="e.g. SOC 2 Type II 2026"
              value={docInput}
              onChange={(e) => setDocInput(e.target.value)}
            />
            <ComplyButton
              variant="secondary"
              className="text-xs"
              onClick={() => {
                if (!docInput.trim()) return;
                setForm((f) => ({ ...f, documents: [...f.documents, docInput.trim()] }));
                setDocInput("");
              }}
            >
              Add
            </ComplyButton>
          </div>
          <ul className="space-y-1 text-sm text-comply-text-secondary">
            {form.documents.map((d) => (
              <li key={d} className="flex items-center justify-between gap-2">
                <span>{d}</span>
                <button
                  type="button"
                  className="text-xs text-comply-red"
                  onClick={() =>
                    setForm((f) => ({ ...f, documents: f.documents.filter((x) => x !== d) }))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-comply-text-tertiary">
            Subprocessors
          </p>
          <div className="flex gap-2">
            <input
              className="comply-input"
              placeholder="e.g. AWS"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
            />
            <ComplyButton
              variant="secondary"
              className="text-xs"
              onClick={() => {
                if (!subInput.trim()) return;
                setForm((f) => ({
                  ...f,
                  subprocessors: [...f.subprocessors, subInput.trim()],
                }));
                setSubInput("");
              }}
            >
              Add
            </ComplyButton>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.subprocessors.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-sm border border-white/[0.08] px-2 py-0.5 text-xs text-comply-text-secondary hover:border-comply-red/40"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    subprocessors: f.subprocessors.filter((x) => x !== s),
                  }))
                }
              >
                {s} ×
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ComplyButton variant="primary" disabled={saving || !form.name.trim()} onClick={() => void save()}>
            {saving ? "Saving…" : "Save changes"}
          </ComplyButton>
          {message ? <span className="text-xs text-comply-text-secondary">{message}</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}
