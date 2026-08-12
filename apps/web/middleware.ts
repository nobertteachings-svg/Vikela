import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAuditor, isAuditorBlockedPath } from "@/lib/clerk-roles";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login(.*)",
  "/signup(.*)",
  "/",
  "/privacy",
  "/terms",
  "/docs",
  "/security",
  "/trust/(.*)",
  "/api/auth(.*)",
]);

/** Proxied to Fastify — auth is Bearer token on the API, not a Clerk session gate here. */
const isApiProxyRoute = createRouteMatcher(["/api/v1(.*)"]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      if (isApiProxyRoute(req)) {
        return NextResponse.next();
      }

      const { orgRole, userId } = await auth();

      // Marketing home (`/`) stays reachable while signed in — CTAs switch to "Open dashboard".
      // (Previously we forced / → /dashboard, which trapped users with no way back to the site.)

      if (userId && isAuditor(orgRole) && isAuditorBlockedPath(req.nextUrl.pathname)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      if (isOnboardingRoute(req) || !isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : function middleware() {
      return;
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
