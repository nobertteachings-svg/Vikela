import { cn } from "@/lib/utils";

const tones = {
  red: "border-comply-red/40 bg-comply-red/10 text-comply-red",
  amber: "border-comply-amber/40 bg-comply-amber/10 text-comply-amber",
  green: "border-comply-green/40 bg-comply-green/10 text-comply-green",
  purple: "border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border",
  muted: "border-white/[0.08] bg-black/25 text-comply-text-secondary",
} as const;

export function SummaryChip({
  label,
  value,
  tone = "muted",
  className,
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border px-4 py-3 backdrop-blur-sm transition-transform hover:-translate-y-0.5",
        tones[tone],
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-85">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
