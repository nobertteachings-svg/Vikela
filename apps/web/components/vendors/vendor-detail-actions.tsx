"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComplyButton } from "@/components/comply/button";
import { apiPatch } from "@/lib/api";

const REVIEW_OPTIONS = [
  { label: "Not reviewed", value: "PENDING" },
  { label: "Review needed", value: "IN_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
] as const;

export function VendorDetailActions({
  vendorId,
  reviewStatus,
}: {
  vendorId: string;
  reviewStatus: string;
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

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/questionnaire?vendorId=${vendorId}`}>
        <ComplyButton variant="primary" className="text-sm">
          Run questionnaire
        </ComplyButton>
      </Link>
      <select
        className="comply-input text-sm"
        value={status}
        disabled={saving}
        onChange={(e) => saveReviewStatus(e.target.value)}
      >
        {REVIEW_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {message ? <span className="text-xs text-comply-text-secondary">{message}</span> : null}
    </div>
  );
}
