import { cn } from "@/lib/utils";

const accentMap = {
  red: "text-comply-red",
  green: "text-comply-green-text",
  purple: "text-comply-purple",
  amber: "text-comply-amber-text",
  dark: "text-comply-text-dark",
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
    <div className="comply-stat group">
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full transition-transform group-hover:scale-110"
        style={{ backgroundColor: "color-mix(in srgb, var(--purple) 8%, transparent)" }}
      />
      <p className="comply-stat-label relative">{label}</p>
      <p className={cn("comply-stat-value relative", accentMap[accent])}>{value}</p>
      {hint != null && hint !== "" && (
        <p className="relative mt-1 text-xs text-comply-text-tertiary">{hint}</p>
      )}
    </div>
  );
}
