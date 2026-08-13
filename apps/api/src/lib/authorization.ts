import type { FastifyRequest } from "fastify";
import type { Member, Role } from "@prisma/client";
import { getClerkAuth, isAuthEnforced, verifyInternalApiSecret } from "./auth.js";
import { ensureMembershipFromSession } from "./membership.js";
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

  let member = await prisma.member.findUnique({
    where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
  });
  if (!member) {
    // Webhook lag / first request after org select, bootstrap Member row.
    try {
      await ensureMembershipFromSession(req);
    } catch {
      /* fall through */
    }
    member = await prisma.member.findUnique({
      where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
    });
  }

  // If session user is not linked yet but this is clearly their Clerk org, attach them.
  if (!member) {
    const headerOrg =
      typeof req.headers["x-clerk-org-id"] === "string"
        ? req.headers["x-clerk-org-id"]
        : Array.isArray(req.headers["x-clerk-org-id"])
          ? req.headers["x-clerk-org-id"][0]
          : undefined;
    const clerkOrgId = auth.orgId ?? headerOrg;
    if (clerkOrgId && clerkOrgId === org.clerkOrgId) {
      const role =
        String((auth as { orgRole?: string }).orgRole ?? "")
          .toLowerCase()
          .includes("admin") ||
        String((auth as { orgRole?: string }).orgRole ?? "")
          .toLowerCase()
          .includes("owner")
          ? "ADMIN"
          : "MEMBER";
      try {
        member = await prisma.member.create({
          data: {
            orgId: org.id,
            clerkId: auth.userId,
            email: `${auth.userId}@users.clerk`,
            name: "Member",
            role,
          },
        });
      } catch {
        member = await prisma.member.findUnique({
          where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
        });
      }
    }
  }

  return member;
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
  if (!member) {
    forbidden(
      "You are not a member of this workspace, select Optic Inc in the org switcher, refresh, and try again."
    );
  }
  if (!allowed.includes(member.role)) {
    forbidden(
      `Insufficient permissions for this action (need ${allowed.join(" or ")}, you are ${member.role}).`
    );
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
