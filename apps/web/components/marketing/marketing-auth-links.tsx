"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Header CTAs that switch when the visitor is already signed in —
 * so marketing home stays reachable from the app without a dead-end.
 */
export function MarketingAuthLinks({
  compact = false,
}: {
  /** Hero-style primary CTA row */
  compact?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  if (hasClerk && !isLoaded) {
    return (
      <div className={compact ? "flex items-center gap-3" : "flex flex-col gap-3 sm:flex-row sm:items-center"}>
        <span className="h-9 w-24 animate-pulse rounded-lg bg-white/10" aria-hidden />
      </div>
    );
  }

  if (hasClerk && isSignedIn) {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="btn-purple-cta px-4"
          >
            Open dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/dashboard" className="btn-purple-cta h-11 px-6 text-sm">
          Open dashboard
        </Link>
        <Link
          href="/help"
          className="inline-flex h-11 items-center justify-center px-4 text-sm text-comply-text-secondary transition-colors hover:text-comply-text-primary"
        >
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
        <Link href="/sign-up" className="btn-purple-cta px-4">
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href="/sign-up" className="btn-purple-cta h-11 px-6 text-sm">
        Start free assessment
      </Link>
      <a
        href="#how-it-works"
        className="inline-flex h-11 items-center justify-center px-4 text-sm text-comply-text-secondary transition-colors hover:text-comply-text-primary"
      >
        See the workflow
      </a>
    </div>
  );
}
