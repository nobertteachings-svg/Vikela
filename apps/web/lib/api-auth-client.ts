"use client";

import { resolveDevOrgSlug } from "./dev-org-slug";

type HeaderGetter = () => Promise<Record<string, string>>;

let clientHeaderGetter: HeaderGetter | null = null;

export function registerClientApiHeaders(getter: HeaderGetter) {
  clientHeaderGetter = getter;
}

export async function getClientApiHeaders(): Promise<Record<string, string>> {
  if (clientHeaderGetter) {
    return clientHeaderGetter();
  }
  const stored =
    typeof window !== "undefined" ? localStorage.getItem("vikela_org_slug") : null;
  const slug = stored || resolveDevOrgSlug() || undefined;
  const clerkOrgId =
    typeof window !== "undefined"
      ? localStorage.getItem("vikela_clerk_org_id")
      : null;
  const headers: Record<string, string> = {};
  if (slug) headers["X-Org-Slug"] = slug;
  if (clerkOrgId) headers["X-Clerk-Org-Id"] = clerkOrgId;
  return headers;
}
