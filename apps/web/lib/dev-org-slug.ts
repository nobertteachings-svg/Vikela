/**
 * Dev-only org slug for Clerk-less local flows.
 * Never silently defaults to "demo", set VIKELA_DEV_ORG_SLUG (or NEXT_PUBLIC_*) explicitly.
 */
export function resolveDevOrgSlug(): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const slug =
    process.env.VIKELA_DEV_ORG_SLUG?.trim() ||
    process.env.NEXT_PUBLIC_VIKELA_DEV_ORG_SLUG?.trim() ||
    "";
  return slug || undefined;
}
