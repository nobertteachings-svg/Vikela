import Link from "next/link";
import type { ElementType } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon: ElementType;
  title: string;
  description: string;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 rounded-full bg-white/[0.06] p-4">
        <Icon className="h-8 w-8 text-comply-text-tertiary" size={32} />
      </div>
      <h3 className="text-lg font-medium text-comply-text-primary">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-comply-text-secondary">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="rounded-lg bg-comply-purple px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-comply-text-secondary hover:bg-white/[0.04]"
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
