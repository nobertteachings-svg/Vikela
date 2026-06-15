import { cn } from "@/lib/utils";
import type { Severity } from "@vikela/shared";

const styles: Record<Severity, string> = {
  CRITICAL: "border-comply-red/50 bg-comply-red/15 text-comply-red",
  HIGH: "border-comply-amber/50 bg-comply-amber/15 text-comply-amber",
  MEDIUM: "border-comply-text-tertiary/30 bg-comply-elevated text-comply-text-tertiary",
  LOW: "border-[var(--border-strong)] bg-comply-primary text-comply-text-secondary",
  INFO: "border-[var(--border-strong)] bg-comply-primary/60 text-comply-text-tertiary",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span className={cn("comply-badge", styles[severity], className)}>
      {severity}
    </span>
  );
}
