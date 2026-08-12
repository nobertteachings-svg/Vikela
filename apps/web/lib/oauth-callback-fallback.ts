import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve OAuth error fallback path from `state` (onboarding:… vs integrations).
 * Defaults to /integrations so failed connects from the Integrations page stay there.
 */
export function oauthErrorFallbackPath(
  state: string | null,
  message: string
): string {
  const returnTo =
    state?.trim().startsWith("onboarding:") || state === "onboarding"
      ? "onboarding"
      : "integrations";
  const base =
    returnTo === "onboarding" ? "/onboarding/connect-repos" : "/integrations";
  return `${base}?error=${encodeURIComponent(message)}`;
}

export function oauthProxyErrorRedirect(
  req: NextRequest,
  state: string | null,
  message: string
): NextResponse {
  return NextResponse.redirect(new URL(oauthErrorFallbackPath(state, message), req.url));
}
