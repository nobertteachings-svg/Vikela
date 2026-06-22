/** Browser-facing web app URL (OAuth redirects, email links). */
export function getAppUrl(): string {
  const raw = (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (process.env.NODE_ENV === "production") return `https://${raw}`;
  return `http://${raw}`;
}
