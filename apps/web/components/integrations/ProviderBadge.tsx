import { cn } from "@/lib/utils";

export function ProviderBadge({
  name,
  brandColor,
  className,
}: {
  name: string;
  brandColor: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold text-white",
        className
      )}
      style={{ backgroundColor: brandColor }}
    >
      {name}
    </span>
  );
}
