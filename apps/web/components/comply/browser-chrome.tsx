import { cn } from "@/lib/utils";

export function BrowserChrome({
  url,
  children,
  className,
  contentClassName,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[640px] overflow-hidden rounded-lg border border-[var(--border)] bg-comply-card",
        className
      )}
    >
      <div className="flex h-7 items-center gap-4 border-b border-[var(--border)] bg-comply-card px-[60px]">
        <div className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-comply-red opacity-60" />
          <span className="h-2 w-2 rounded-full bg-comply-amber opacity-60" />
          <span
            className="h-2 w-2 rounded-full opacity-60"
            style={{ backgroundColor: "#639922" }}
          />
        </div>
        <div className="mx-auto flex min-w-0 flex-1 justify-center">
          <div className="rounded-full border border-[var(--border)] bg-comply-app px-4 py-0.5">
            <span className="truncate text-xs text-comply-text-secondary">{url}</span>
          </div>
        </div>
        <div className="w-[52px] shrink-0" aria-hidden />
      </div>
      <div className={cn("flex flex-col items-center px-6 py-8", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
