"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconDatabaseImport } from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { apiPost } from "@/lib/api";
import {
  collectFromGapsMessageTone,
  formatCollectFromGapsMessage,
  type CollectFromGapsResult,
} from "@/lib/collect-from-gaps";
import { useOrgRole } from "@/hooks/use-org-role";
import { cn } from "@/lib/utils";

type CollectFromGapsButtonProps = {
  openGaps?: number;
  hasSampleGaps?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
};

export function CollectFromGapsButton({
  openGaps,
  hasSampleGaps = false,
  variant = "primary",
  className,
}: CollectFromGapsButtonProps) {
  const router = useRouter();
  const { isAuditor: auditor, isLoaded } = useOrgRole();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "neutral" | "muted">("success");

  async function collect() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiPost<CollectFromGapsResult>("/api/v1/evidence/collect-from-gaps");
      setMessage(formatCollectFromGapsMessage(result));
      setTone(collectFromGapsMessageTone(result));
      if (result.created > 0) {
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to collect evidence");
      setTone("muted");
    } finally {
      setLoading(false);
    }
  }

  const disabled = hasSampleGaps || (isLoaded && auditor);

  if (isLoaded && auditor) return null;

  const helperText = hasSampleGaps
    ? "Sample findings can't be collected as evidence, run a full scan on a connected repo first."
    : openGaps === 0
      ? "No open gaps yet. Run a scan to generate findings you can collect."
      : openGaps != null
        ? `${openGaps} open gap${openGaps === 1 ? "" : "s"} available to collect from.`
        : "Create evidence records from open scan findings linked to controls.";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ComplyButton variant={variant} disabled={loading || disabled} onClick={collect}>
        <IconDatabaseImport size={18} />
        {loading ? "Collecting…" : "Collect from gaps"}
      </ComplyButton>
      {!hasSampleGaps && openGaps !== undefined && (
        <p className="text-xs text-comply-text-tertiary">{helperText}</p>
      )}
      {hasSampleGaps && (
        <p className="text-xs text-amber-200/80">{helperText}</p>
      )}
      {message && (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-xs",
            tone === "success" && "border-comply-green/30 bg-comply-green/10 text-comply-green",
            tone === "neutral" && "border-comply-green-border/30 bg-comply-green/10 text-comply-text-secondary",
            tone === "muted" && "border-white/10 bg-white/[0.04] text-comply-text-tertiary"
          )}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
