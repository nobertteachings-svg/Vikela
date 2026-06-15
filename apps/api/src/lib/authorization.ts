import type { FastifyRequest } from "fastify";
import type { Member, Role } from "@prisma/client";
import { getClerkAuth, isAuthEnforced, verifyInternalApiSecret } from "./auth.js";
import { prisma } from "./prisma.js";
import { requireOrganization } from "./org-context.js";

export const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];
export const WRITE_ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER"];
export const READ_ROLES: Role[] = ["OWNER", "ADMIN", "MEMBER", "AUDITOR"];
export const EXPORT_ROLES: Role[] = ["OWNER", "ADMIN", "AUDITOR"];

function forbidden(message = "Forbidden"): never {
  const err = new Error(message);
  (err as { statusCode?: number }).statusCode = 403;
  throw err;
}

/** Resolve current member for the request org. Skips in dev when auth is not enforced. */
export async function getMemberForRequest(
  req: FastifyRequest
): Promise<Member | null> {
  if (!isAuthEnforced()) return null;
  if (verifyInternalApiSecret(req) && !getClerkAuth(req)?.userId) return null;
  if (req.apiKeyAuth) return null;

  const org = await requireOrganization(req);
  const auth = getClerkAuth(req);
  if (!auth?.userId) return null;

  return prisma.member.findUnique({
    where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
  });
}

export async function requireRole(
  req: FastifyRequest,
  allowed: Role[]
): Promise<Member | null> {
  if (!isAuthEnforced()) return null;

  if (req.apiKeyAuth) {
    const adminOnly =
      allowed.length > 0 && allowed.every((r) => ADMIN_ROLES.includes(r));
    if (adminOnly) {
      forbidden("API keys cannot perform admin-only actions");
    }
    return null;
  }

  if (verifyInternalApiSecret(req) && !getClerkAuth(req)?.userId) {
    if (process.env.NODE_ENV === "production") {
      forbidden("Service authentication requires a signed-in user");
    }
    return null;
  }

  const member = await getMemberForRequest(req);
  if (!member || !allowed.includes(member.role)) {
    forbidden("Insufficient permissions for this action");
  }
  return member;
}

export async function requireAdmin(req: FastifyRequest): Promise<Member | null> {
  return requireRole(req, ADMIN_ROLES);
}

export async function requireWrite(req: FastifyRequest): Promise<Member | null> {
  return requireRole(req, WRITE_ROLES);
}

export async function requireRead(req: FastifyRequest): Promise<Member | null> {
  return requireRole(req, READ_ROLES);
}

/** Block AUDITOR from mutation routes. */
export async function requireMutation(req: FastifyRequest): Promise<Member | null> {
  return requireWrite(req);
}

export async function requireExportRole(req: FastifyRequest): Promise<Member | null> {
  return requireRole(req, EXPORT_ROLES);
}
