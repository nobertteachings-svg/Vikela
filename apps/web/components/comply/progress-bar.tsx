import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  suffix,
  variant = "purple",
}: {
  value: number;
  label: string;
  suffix?: string;
  variant?: "purple" | "green";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-comply-text-primary">{label}</span>
        <span className="font-mono text-xs text-comply-text-secondary">{suffix ?? `${value}%`}</span>
      </div>
      <div className="comply-progress-track">
        <div
          className={cn(
            "comply-progress-bar",
            variant === "green" && "from-comply-green-dark to-comply-green"
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
