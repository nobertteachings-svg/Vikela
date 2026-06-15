import { DEMO_ORG_SLUG } from "./org-context.js";

export type OAuthReturnTo = "integrations" | "onboarding";

export function encodeOAuthState(orgSlug: string, returnTo: OAuthReturnTo = "integrations"): string {
  if (returnTo === "onboarding") return `onboarding:${orgSlug}`;
  return orgSlug;
}

export function parseOAuthState(state: string | undefined): {
  orgSlug: string | null;
  returnTo: OAuthReturnTo;
} {
  const raw = state?.trim();
  if (!raw) {
    return {
      orgSlug: process.env.NODE_ENV === "production" ? null : DEMO_ORG_SLUG,
      returnTo: "integrations",
    };
  }

  if (raw.startsWith("onboarding:")) {
    const orgSlug = raw.slice("onboarding:".length).trim();
    return {
      orgSlug: orgSlug || (process.env.NODE_ENV === "production" ? null : DEMO_ORG_SLUG),
      returnTo: "onboarding",
    };
  }

  return { orgSlug: raw, returnTo: "integrations" };
}

export function oauthSuccessRedirect(
  returnTo: OAuthReturnTo,
  params: Record<string, string>
): string {
  const app = process.env.APP_URL ?? "http://localhost:3000";
  const base =
    returnTo === "onboarding" ? `${app}/onboarding/connect-repos` : `${app}/integrations`;
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}
