import { DEMO_ORG_SLUG } from "./org-context.js";

/** OAuth state org slug — never default to demo in production. */
export function resolveOAuthOrgSlug(orgParam: string | undefined): string | null {
  if (orgParam?.trim()) return orgParam.trim();
  if (process.env.NODE_ENV === "production") return null;
  return DEMO_ORG_SLUG;
}

export function oauthOrgErrorRedirect(): string {
  const app = process.env.APP_URL ?? "http://localhost:3000";
  return `${app}/integrations?error=org_context_required`;
}
