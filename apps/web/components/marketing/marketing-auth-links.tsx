"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const GREEN_CTA =
  "inline-flex items-center justify-center rounded-md bg-comply-green font-medium text-comply-green-light transition-opacity hover:opacity-90";

const QUIET =
  "inline-flex items-center justify-center rounded-md border border-[var(--border-strong)] bg-transparent font-medium text-comply-text-secondary transition-colors hover:border-comply-green/40 hover:text-comply-text-primary";

/**
 * Header CTAs that switch when the visitor is already signed in,
 * so marketing home stays reachable from the app without a dead-end.
 */
export function MarketingAuthLinks({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (hasClerk && !isLoaded) {
    return (
      <div className={compact ? "flex items-center gap-3" : "flex flex-col gap-3 sm:flex-row sm:items-center"}>
        <span className="h-9 w-24 animate-pulse rounded-md bg-white/10" aria-hidden />
      </div>
    );
  }

  if (hasClerk && isSignedIn) {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={cn(GREEN_CTA, "h-8 px-4 text-xs")}>
            Open dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/dashboard" className={cn(GREEN_CTA, "h-11 px-6 text-sm")}>
          Open dashboard
        </Link>
        <Link href="/help" className={cn(QUIET, "h-11 px-6 text-sm")}>
          Help center
        </Link>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden text-sm text-comply-text-secondary sm:inline hover:text-comply-text-primary"
        >
          Sign in
        </Link>
        <Link href="/sign-up" className={cn(GREEN_CTA, "h-8 px-4 text-xs")}>
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href="/sign-up" className={cn(GREEN_CTA, "h-11 px-6 text-sm")}>
        Start free
      </Link>
      <a href="#pricing" className={cn(QUIET, "h-11 px-6 text-sm")}>
        View pricing
      </a>
    </div>
  );
}
