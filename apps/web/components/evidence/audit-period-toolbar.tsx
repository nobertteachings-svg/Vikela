"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconDownload } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { apiPostBlob } from "@/lib/api-blob";
import { useOrgRole } from "@/hooks/use-org-role";
import { canExportEvidence } from "@/lib/clerk-roles";
import { cn } from "@/lib/utils";

function defaultPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const INITIAL_PERIOD = defaultPeriod();

type AuditPeriodToolbarProps = {
  className?: string;
};

export function AuditPeriodToolbar({ className }: AuditPeriodToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { orgRole, isLoaded } = useOrgRole();
  const [, startTransition] = useTransition();

  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const applyPeriod = useCallback(
    (nextFrom: string, nextTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextFrom) params.set("from", nextFrom);
      else params.delete("from");
      if (nextTo) params.set("to", nextTo);
      else params.delete("to");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const [from, setFrom] = useState(fromParam || INITIAL_PERIOD.from);
  const [to, setTo] = useState(toParam || INITIAL_PERIOD.to);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!fromParam && !toParam) {
      applyPeriod(INITIAL_PERIOD.from, INITIAL_PERIOD.to);
      return;
    }
    setFrom(fromParam || INITIAL_PERIOD.from);
    setTo(toParam || INITIAL_PERIOD.to);
  }, [fromParam, toParam, applyPeriod]);

  function onFromChange(value: string) {
    setFrom(value);
    applyPeriod(value, to);
  }

  function onToChange(value: string) {
    setTo(value);
    applyPeriod(from, value);
  }

  async function exportPackage() {
    if (!from || !to) {
      setMessage("Select a start and end date for the audit period.");
      return;
    }
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiPostBlob("/api/v1/evidence/export", { from, to });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const showExport = isLoaded && canExportEvidence(orgRole);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end", className)}>
      <label className="flex flex-col gap-1 text-xs text-comply-text-tertiary">
        Period from
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-comply-text-primary"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-comply-text-tertiary">
        Period to
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-comply-text-primary"
        />
      </label>
      {showExport && (
        <ComplyButton variant="secondary" disabled={exporting} onClick={exportPackage}>
          <IconDownload size={18} />
          {exporting ? "Preparing export…" : "Export audit package"}
        </ComplyButton>
      )}
      {exporting && (
        <p className="text-xs text-comply-text-tertiary" role="status">
          Building ZIP — this may take a moment for large evidence sets.
        </p>
      )}
      {message && (
        <p className="text-xs text-amber-200/90" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
