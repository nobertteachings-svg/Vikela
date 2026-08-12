/** Shared API headers for Playwright when Clerk is configured locally. */
export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Org-Slug": process.env.VIKELA_DEV_ORG_SLUG ?? "demo",
    ...extra,
  };
  const internal = process.env.INTERNAL_API_SECRET?.trim();
  if (internal) {
    headers["X-Vikela-Internal-Secret"] = internal;
  }
  return headers;
}

export function apiBaseUrl(): string {
  return process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";
}
