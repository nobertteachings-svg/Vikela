import { cn } from "@/lib/utils";
import type { UiControlStatus } from "@/lib/format";

const config: Record<UiControlStatus, { label: string; className: string }> = {
  passing: { label: "Passing", className: "border-comply-green/40 bg-comply-green/15 text-comply-green" },
  failing: { label: "Failing", className: "border-comply-red/40 bg-comply-red/15 text-comply-red" },
  in_progress: { label: "In progress", className: "border-comply-amber/40 bg-comply-amber/15 text-comply-amber" },
  not_started: { label: "Not started", className: "border-[var(--border-strong)] bg-comply-primary text-comply-text-secondary" },
};

export function ControlStatusBadge({ status }: { status: UiControlStatus }) {
  const c = config[status];
  return <span className={cn("comply-badge normal-case tracking-normal", c.className)}>{c.label}</span>;
}
