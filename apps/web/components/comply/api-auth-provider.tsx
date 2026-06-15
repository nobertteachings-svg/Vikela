"use client";

import { useEffect } from "react";
import { registerClientApiHeaders } from "@/lib/api-auth-client";
import { ClerkApiAuthBridge } from "./clerk-api-auth-bridge";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (hasClerk) return;

    registerClientApiHeaders(async () => {
      const slug =
        typeof window !== "undefined"
          ? localStorage.getItem("vikela_org_slug") ?? "demo"
          : "demo";
      const clerkOrgId =
        typeof window !== "undefined"
          ? localStorage.getItem("vikela_clerk_org_id")
          : null;
      const headers: Record<string, string> = { "X-Org-Slug": slug };
      if (clerkOrgId) headers["X-Clerk-Org-Id"] = clerkOrgId;
      return headers;
    });
  }, []);

  if (hasClerk) {
    return <ClerkApiAuthBridge>{children}</ClerkApiAuthBridge>;
  }

  return <>{children}</>;
}
