import type { Severity } from "@vikela/shared";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const SEVERITY_META: Record<
  Severity,
  { label: string; barClass: string; dotClass: string }
> = {
  CRITICAL: {
    label: "Critical",
    barClass: "bg-red-500",
    dotClass: "bg-red-500",
  },
  HIGH: {
    label: "High",
    barClass: "bg-orange-500",
    dotClass: "bg-orange-500",
  },
  MEDIUM: {
    label: "Medium",
    barClass: "bg-amber-500",
    dotClass: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    barClass: "bg-sky-500",
    dotClass: "bg-sky-500",
  },
  INFO: {
    label: "Info",
    barClass: "bg-zinc-500",
    dotClass: "bg-zinc-500",
  },
};

export function SeverityBreakdownBar({
  counts,
}: {
  counts: Record<Severity, number>;
}) {
  const total = SEVERITY_ORDER.reduce((sum, severity) => sum + (counts[severity] ?? 0), 0);

  if (total === 0) {
    return (
      <p className="text-sm text-comply-text-secondary">
        No open gaps, run a scan to keep posture current.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-black/30">
        {SEVERITY_ORDER.map((severity) => {
          const count = counts[severity] ?? 0;
          if (count === 0) return null;
          const width = (count / total) * 100;
          return (
            <div
              key={severity}
              className={cn(SEVERITY_META[severity].barClass, "h-full transition-all")}
              style={{ width: `${width}%` }}
              title={`${SEVERITY_META[severity].label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {SEVERITY_ORDER.map((severity) => {
          const count = counts[severity] ?? 0;
          if (count === 0) return null;
          return (
            <div key={severity} className="flex items-center gap-2 text-xs text-comply-text-secondary">
              <span className={cn("h-2 w-2 rounded-full", SEVERITY_META[severity].dotClass)} />
              <span>
                {SEVERITY_META[severity].label}{" "}
                <span className="font-mono text-comply-text-primary">{count}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
