"use client";

type HeaderGetter = () => Promise<Record<string, string>>;

let clientHeaderGetter: HeaderGetter | null = null;

export function registerClientApiHeaders(getter: HeaderGetter) {
  clientHeaderGetter = getter;
}

export async function getClientApiHeaders(): Promise<Record<string, string>> {
  if (clientHeaderGetter) {
    return clientHeaderGetter();
  }
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
}
