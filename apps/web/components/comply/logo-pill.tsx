import { IconShieldCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type LogoPillProps = {
  className?: string;
  showLabel?: boolean;
  size?: "md" | "sm";
};

export function LogoPill({ className, showLabel = true, size = "md" }: LogoPillProps) {
  const iconBox =
    size === "sm"
      ? "h-9 w-9 shadow-[0_0_20px_-4px_var(--purple-glow)]"
      : "h-11 w-11 shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]";
  const iconSize = size === "sm" ? 18 : 22;
  const labelClass =
    size === "sm"
      ? "text-base font-semibold tracking-tight text-comply-text-primary"
      : "text-sm font-medium tracking-tight text-comply-text-primary";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20",
          iconBox
        )}
      >
        <IconShieldCheck size={iconSize} className="text-comply-purple-border" stroke={1.5} />
      </span>
      {showLabel && <span className={labelClass}>Shieldoq</span>}
    </span>
  );
}
