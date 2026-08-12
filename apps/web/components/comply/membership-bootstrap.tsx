"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { apiPost, setOrgContext } from "@/lib/api";

type EnsureMembershipResult = {
  orgReady?: boolean;
  memberReady?: boolean;
  orgSlug?: string;
  needsClerkOrg?: boolean;
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Ensures Vikela org + Member exist when Clerk session is ready.
 * Prevents 403 "not a member" on /dashboard before onboarding runs ensure-membership.
 */
function MembershipBootstrapInner({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgId) return;

    const key = orgId;
    if (lastKey.current === key) return;
    lastKey.current = key;

    void apiPost<EnsureMembershipResult>("/api/v1/onboarding/ensure-membership")
      .then((result) => {
        if (result.orgSlug) setOrgContext(result.orgSlug, orgId);
      })
      .catch(() => {
        // Allow retry on next org/session change
        lastKey.current = null;
      });
  }, [isLoaded, isSignedIn, orgId]);

  return <>{children}</>;
}

export function MembershipBootstrap({ children }: { children: React.ReactNode }) {
  if (!hasClerk) return <>{children}</>;
  return <MembershipBootstrapInner>{children}</MembershipBootstrapInner>;
}
