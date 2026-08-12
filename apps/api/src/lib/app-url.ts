/** Browser-facing web app URL (OAuth redirects, email links). */
export function getAppUrl(): string {
  const raw = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (process.env.NODE_ENV === "production") return `https://${raw}`;
  return `http://${raw}`;
}

/**
 * Public API base URL for provider webhooks (GitLab/Bitbucket must reach this).
 * Prefer API_PUBLIC_URL (ngrok / production API), then API_URL.
 */
export function getApiPublicUrl(): string {
  const raw = (
    process.env.API_PUBLIC_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (process.env.NODE_ENV === "production") return `https://${raw}`;
  return `http://${raw}`;
}
