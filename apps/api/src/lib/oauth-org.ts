import { DEMO_ORG_SLUG } from "./org-context.js";

/** OAuth state org slug, never default to demo in production. */
export function resolveOAuthOrgSlug(orgParam: string | undefined): string | null {
  if (orgParam?.trim()) return orgParam.trim();
  if (process.env.NODE_ENV === "production") return null;
  return DEMO_ORG_SLUG;
}

import { getAppUrl } from "./app-url.js";

export function oauthOrgErrorRedirect(from?: "onboarding" | "integrations"): string {
  const app = getAppUrl();
  if (from === "onboarding") return `${app}/onboarding/connect-repos?error=org_context_required`;
  return `${app}/integrations?error=org_context_required`;
}
