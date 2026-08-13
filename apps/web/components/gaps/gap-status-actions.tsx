"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCircleCheck } from "@tabler/icons-react";
import { useOrgRole } from "@/hooks/use-org-role";
import { apiPatch } from "@/lib/api";
import { formatGapStatus } from "@/lib/format";
import type { GapStatus } from "@vikela/shared";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: GapStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

export function GapStatusActions({
  gapId,
  status,
}: {
  gapId: string;
  status: GapStatus;
}) {
  const router = useRouter();
  const { isAuditor, isLoaded } = useOrgRole();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoaded && isAuditor) return null;

  async function updateStatus(next: GapStatus) {
    if (next === status || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/v1/gaps/${gapId}`, { status: next });
      if (next === "RESOLVED") {
        router.push("/gaps");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-comply-text-secondary">
          <span className="font-medium">Status</span>
          <select
            value={status}
            disabled={busy}
            onChange={(e) => updateStatus(e.target.value as GapStatus)}
            className={cn(
              "rounded-md border border-[var(--border)] bg-comply-primary px-2 py-1.5 text-xs text-comply-text-primary",
              "focus:border-comply-purple-border focus:outline-none focus:ring-1 focus:ring-comply-purple-border/40",
              busy && "opacity-60"
            )}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatGapStatus(value)}
              </option>
            ))}
          </select>
        </label>
        {status !== "RESOLVED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => updateStatus("RESOLVED")}
            className="comply-btn-primary inline-flex text-xs"
          >
            <IconCircleCheck size={14} />
            Mark resolved
          </button>
        )}
      </div>
      {error && <p className="text-xs text-comply-red">{error}</p>}
    </div>
  );
}
