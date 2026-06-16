"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { registerClientApiHeaders } from "@/lib/api-auth-client";
import { initPostHog, posthog } from "@/lib/posthog-client";

/** Registers API headers from Clerk session — must render inside ClerkProvider. */
export function ClerkApiAuthBridge({ children }: { children: React.ReactNode }) {
  const { getToken, userId, orgId, orgSlug, isLoaded } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    registerClientApiHeaders(async () => {
      const headers: Record<string, string> = {};
      if (orgId) headers["X-Clerk-Org-Id"] = orgId;

      // Prefer Vikela DB slug (set after /onboarding/status) over Clerk org slug.
      const vikelaSlug =
        typeof window !== "undefined" ? localStorage.getItem("vikela_org_slug") : null;
      if (vikelaSlug) headers["X-Org-Slug"] = vikelaSlug;
      else if (orgSlug) headers["X-Org-Slug"] = orgSlug;

      if (isLoaded) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      return headers;
    });
  }, [getToken, orgId, orgSlug, isLoaded]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (userId && orgId) {
      posthog.identify(userId);
      posthog.group("company", orgId, orgSlug ? { orgSlug } : undefined);
    }
  }, [userId, orgId, orgSlug]);

  return <>{children}</>;
}
