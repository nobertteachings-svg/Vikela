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
  "/api/auth(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { orgRole, userId } = await auth();

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
