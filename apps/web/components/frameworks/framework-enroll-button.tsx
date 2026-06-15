"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCircleCheck, IconPlus } from "@tabler/icons-react";
import { useOrgRole } from "@/hooks/use-org-role";
import { apiDelete, apiPost } from "@/lib/api";
import type { FrameworkRow } from "@/lib/compliance-api";
import { cn } from "@/lib/utils";

export function FrameworkEnrollButton({
  framework,
  className,
}: {
  framework: FrameworkRow;
  className?: string;
}) {
  const router = useRouter();
  const { appRole, isAuditor, isLoaded } = useOrgRole();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canManage = isLoaded && !isAuditor && appRole === "admin";

  if (!canManage) return null;

  async function enroll() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiPost<{ controlsCreated: number }>(
        `/api/v1/frameworks/${framework.slug}/enroll`
      );
      setMessage(
        result.controlsCreated > 0
          ? `Enabled — ${result.controlsCreated} controls added`
          : "Enabled"
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to enable framework");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll() {
    if (!confirm(`Disable ${framework.name}? Controls with evidence or shared with other frameworks will be kept.`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/frameworks/${framework.slug}/enroll`);
      setMessage("Disabled");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to disable framework");
    } finally {
      setBusy(false);
    }
  }

  if (framework.enrolled) {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <button
          type="button"
          disabled={busy}
          onClick={unenroll}
          className="text-xs font-medium text-comply-text-tertiary hover:text-comply-text-secondary disabled:opacity-50"
        >
          Disable framework
        </button>
        {message && <p className="text-xs text-comply-text-secondary">{message}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={enroll}
        className="comply-btn-primary inline-flex text-xs disabled:opacity-50"
      >
        {busy ? (
          "Enabling…"
        ) : (
          <>
            <IconPlus size={14} />
            Enable framework
          </>
        )}
      </button>
      {message && (
        <p className={cn("text-xs", message.startsWith("Enabled") ? "text-comply-green" : "text-comply-red")}>
          {message.startsWith("Enabled") && <IconCircleCheck size={12} className="mr-1 inline" />}
          {message}
        </p>
      )}
    </div>
  );
}
