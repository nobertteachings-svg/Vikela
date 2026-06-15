import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  eyebrow = "Program",
  children,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1
          className={cn(
            "font-medium tracking-tight text-comply-text-primary text-balance",
            eyebrow ? "mt-2 text-2xl sm:text-[1.75rem]" : "text-2xl sm:text-[1.75rem]"
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
