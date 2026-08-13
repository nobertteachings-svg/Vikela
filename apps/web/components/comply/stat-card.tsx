import { cn } from "@/lib/utils";

const accentMap = {
  red: "text-comply-red",
  green: "text-comply-green",
  purple: "text-comply-green",
  amber: "text-comply-amber",
  dark: "text-comply-text-primary",
} as const;

export function StatCard({
  label,
  value,
  accent = "purple",
  hint,
}: {
  label: string;
  value: string;
  accent?: keyof typeof accentMap;
  hint?: React.ReactNode;
}) {
  return (
    <div className="comply-stat">
      <p className="comply-stat-label">{label}</p>
      <p className={cn("comply-stat-value", accentMap[accent])}>{value}</p>
      {hint != null && hint !== "" ? (
        <p className="mt-1 text-xs text-comply-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
