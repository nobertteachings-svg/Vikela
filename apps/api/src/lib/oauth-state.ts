import { DEMO_ORG_SLUG } from "./org-context.js";
import { getAppUrl } from "./app-url.js";

export type OAuthReturnTo = "integrations" | "onboarding";

export function encodeOAuthState(
  orgSlug: string,
  returnTo: OAuthReturnTo = "integrations",
  clerkOrgId?: string
): string {
  const payload = clerkOrgId?.trim()
    ? `${orgSlug}::${clerkOrgId.trim()}`
    : orgSlug;
  if (returnTo === "onboarding") return `onboarding:${payload}`;
  return payload;
}

export function parseOAuthState(state: string | undefined): {
  orgSlug: string | null;
  clerkOrgId: string | null;
  returnTo: OAuthReturnTo;
} {
  const raw = state?.trim();
  if (!raw) {
    return {
      orgSlug: process.env.NODE_ENV === "production" ? null : DEMO_ORG_SLUG,
      clerkOrgId: null,
      returnTo: "integrations",
    };
  }

  if (raw.startsWith("onboarding:")) {
    const payload = raw.slice("onboarding:".length).trim();
    const [orgSlugPart, clerkOrgIdPart] = payload.split("::");
    const orgSlug =
      orgSlugPart?.trim() ||
      (process.env.NODE_ENV === "production" ? null : DEMO_ORG_SLUG);
    return {
      orgSlug,
      clerkOrgId: clerkOrgIdPart?.trim() || null,
      returnTo: "onboarding",
    };
  }

  const [orgSlugPart, clerkOrgIdPart] = raw.split("::");
  return {
    orgSlug: orgSlugPart?.trim() || null,
    clerkOrgId: clerkOrgIdPart?.trim() || null,
    returnTo: "integrations",
  };
}

export function oauthSuccessRedirect(
  returnTo: OAuthReturnTo,
  params: Record<string, string>
): string {
  const app = getAppUrl();
  const base =
    returnTo === "onboarding" ? `${app}/onboarding/connect-repos` : `${app}/integrations`;
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}
