"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CLOUD_GAP_SOURCES_PARAM, gapSourceFilterSelection } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS = [
  { value: "", label: "All severities" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFO", label: "Info" },
] as const;

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "CODE", label: "Code" },
  { value: "IAM", label: "Identity" },
  { value: "CLOUD", label: "Cloud (all)" },
] as const;

const STATUS_TABS = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

type GapsListToolbarProps = {
  className?: string;
};

export function GapsListToolbar({ className }: GapsListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const status = searchParams.get("status") === "RESOLVED" ? "RESOLVED" : "OPEN";
  const severity = searchParams.get("severity") ?? "";
  const sourceSelection = gapSourceFilterSelection(searchParams.get("source") ?? undefined);

  const sourceDropdownValue =
    sourceSelection === "CODE" || sourceSelection === "IAM" || sourceSelection === "CLOUD"
      ? sourceSelection
      : "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  function onSeverityChange(value: string) {
    updateParams({ severity: value || null });
  }

  function onSourceChange(value: string) {
    let source: string | null = null;
    if (value === "CLOUD") source = CLOUD_GAP_SOURCES_PARAM;
    else if (value) source = value;
    updateParams({ source });
  }

  function onStatusChange(next: "OPEN" | "RESOLVED") {
    updateParams({ status: next === "OPEN" ? null : next });
  }

  const selectClass =
    "rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-comply-text-primary focus:border-comply-green-border focus:outline-none focus:ring-1 focus:ring-comply-green-border/40";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-comply-green-border/50 bg-comply-green/15 text-comply-green-border"
                : "border-white/10 bg-white/[0.03] text-comply-text-secondary hover:border-white/20 hover:text-comply-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-comply-text-tertiary">
          Severity
          <select
            value={severity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className={selectClass}
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-comply-text-tertiary">
          Source
          <select
            value={sourceDropdownValue}
            onChange={(e) => onSourceChange(e.target.value)}
            className={selectClass}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
