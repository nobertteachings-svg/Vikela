import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoPillProps = {
  className?: string;
  showLabel?: boolean;
  size?: "md" | "sm";
};

export function LogoPill({ className, showLabel = true, size = "md" }: LogoPillProps) {
  if (!showLabel) {
    const iconPx = size === "sm" ? 36 : 44;
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src="/brand/shieldoq-icon.png"
          alt="Shieldoq"
          width={iconPx}
          height={iconPx}
          className="shrink-0 rounded-lg"
          priority
        />
      </span>
    );
  }

  const width = size === "sm" ? 148 : 176;
  const height = size === "sm" ? 40 : 48;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/brand/shieldoq-logo.png"
        alt="Shieldoq"
        width={width}
        height={height}
        className={cn(
          "w-auto object-contain object-left",
          size === "sm" ? "h-8" : "h-10"
        )}
        priority
      />
    </span>
  );
}
