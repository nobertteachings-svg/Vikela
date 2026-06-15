import type { FastifyRequest } from "fastify";
import { getAuth } from "@clerk/fastify";

/** True when Clerk secret is set or running in production. */
export function isAuthEnforced(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.CLERK_SECRET_KEY)
  );
}

/** Routes that skip Clerk session checks (webhooks, OAuth, health). */
export function isPublicApiPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  if (path === "/health") return true;
  if (path.startsWith("/api/v1/webhooks/")) return true;
  if (path.startsWith("/api/v1/auth/")) return true;
  if (path === "/api/v1/aws/cloudformation-template") return true;
  return false;
}

export function getClerkAuth(req: FastifyRequest) {
  try {
    return getAuth(req);
  } catch {
    return null;
  }
}

export function requireApiAuth(req: FastifyRequest): { userId: string; orgId?: string } {
  const auth = getClerkAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    const err = new Error("Unauthorized");
    (err as { statusCode?: number }).statusCode = 401;
    throw err;
  }
  return { userId, orgId: auth.orgId ?? undefined };
}

/** Service-to-service calls from Next.js server when Clerk is not used on the browser. */
export function verifyInternalApiSecret(req: FastifyRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const header = req.headers["x-vikela-internal-secret"];
  const value = Array.isArray(header) ? header[0] : header;
  return value === secret;
}

export function isDemoConnectAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEMO_INTEGRATIONS === "true"
  );
}

/** Fail fast in production if Clerk is not configured. */
export function requireProductionClerkConfig(): void {
  if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
    throw new Error(
      "CLERK_SECRET_KEY is required in production. Set Clerk keys before starting the API."
    );
  }
}
