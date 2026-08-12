import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parseOrgRole } from "@/lib/clerk-roles";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Gate OAuth start routes to org admins when Clerk is enabled.
 * Returns a redirect Response when blocked; null when allowed.
 */
export async function denyNonAdminOAuthStart(
  req: NextRequest,
  returnPath: "/integrations" | "/onboarding/connect-repos" = "/integrations"
): Promise<NextResponse | null> {
  if (!hasClerk) return null;

  const session = await auth();
  if (!session.userId) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", returnPath);
    return NextResponse.redirect(signIn);
  }

  const role = parseOrgRole(session.orgRole);
  if (role !== "admin") {
    const dest = new URL(returnPath, req.url);
    dest.searchParams.set("error", "Only organization admins can connect integrations.");
    return NextResponse.redirect(dest);
  }

  return null;
}

export function oauthReturnPathFromQuery(
  from: string | null
): "/integrations" | "/onboarding/connect-repos" {
  return from === "onboarding" ? "/onboarding/connect-repos" : "/integrations";
}
