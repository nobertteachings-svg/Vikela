import { IconShieldCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type LogoPillProps = {
  className?: string;
  showLabel?: boolean;
  size?: "md" | "sm";
};

export function LogoPill({ className, showLabel = true, size = "md" }: LogoPillProps) {
  const iconBox = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconSize = size === "sm" ? 18 : 22;
  const labelClass =
    size === "sm"
      ? "text-base font-semibold tracking-tight text-comply-text-primary"
      : "text-sm font-medium tracking-tight text-comply-text-primary";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-md border border-comply-green/40 bg-comply-green/15",
          iconBox
        )}
      >
        <IconShieldCheck size={iconSize} className="text-comply-green" stroke={1.5} />
      </span>
      {showLabel && <span className={labelClass}>Vikela</span>}
    </span>
  );
}
