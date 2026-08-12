"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import { ComplyButton } from "@/components/comply/button";

const REVIEW_OPTIONS = [
  { label: "Not reviewed", value: "PENDING" },
  { label: "Review needed", value: "IN_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
] as const;

export function VendorDetailActions({
  vendorId,
  reviewStatus,
  questionnaireId,
}: {
  vendorId: string;
  reviewStatus: string;
  questionnaireId?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(reviewStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveReviewStatus(next: string) {
    setSaving(true);
    setMessage(null);
    setStatus(next);
    try {
      await apiPatch(`/api/v1/vendors/${vendorId}`, { reviewStatus: next });
      setMessage("Review status updated");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function runQuestionnaire() {
    setSaving(true);
    setMessage(null);
    try {
      if (questionnaireId) {
        router.push(`/questionnaire?vendorId=${vendorId}`);
        return;
      }
      const created = await apiPost<{ id: string }>(
        `/api/v1/vendors/${vendorId}/questionnaire`,
        {}
      );
      router.push(`/questionnaire?vendorId=${vendorId}&qid=${created.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not start questionnaire");
      setSaving(false);
    }
  }

  async function removeVendor() {
    if (!window.confirm("Delete this vendor from the inventory?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/vendors/${vendorId}`);
      router.push("/vendors");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ComplyButton
          variant="primary"
          className="text-sm"
          disabled={saving}
          onClick={() => void runQuestionnaire()}
        >
          {questionnaireId ? "Open questionnaire" : "Run questionnaire"}
        </ComplyButton>
        <select
          className="comply-input h-9 text-sm"
          value={status}
          disabled={saving}
          onChange={(e) => void saveReviewStatus(e.target.value)}
        >
          {REVIEW_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ComplyButton
          variant="ghost"
          className="text-sm text-comply-red"
          disabled={saving}
          onClick={() => void removeVendor()}
        >
          Delete
        </ComplyButton>
      </div>
      {message ? <span className="text-xs text-comply-text-secondary">{message}</span> : null}
    </div>
  );
}
