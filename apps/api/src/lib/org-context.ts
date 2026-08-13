import type { FastifyRequest } from "fastify";
import type { Organization } from "@prisma/client";
import { getClerkAuth, isAuthEnforced, verifyInternalApiSecret } from "./auth.js";
import { ensureOrganizationFromSession } from "./clerk-org-provision.js";
import { prisma } from "./prisma.js";

export const DEMO_ORG_SLUG = "demo";

function headerValue(
  req: FastifyRequest | undefined,
  name: string
): string | undefined {
  if (!req) return undefined;
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

async function findOrgBySlugHint(slug: string): Promise<Organization | null> {
  const exact = await prisma.organization.findUnique({ where: { slug } });
  if (exact) return exact;

  // Clerk orgSlug is often `optic-inc` while Vikela stores `optic-inc-tcwm3o`.
  const prefixed = await prisma.organization.findMany({
    where: { slug: { startsWith: `${slug}-` } },
    take: 2,
  });
  if (prefixed.length === 1) return prefixed[0] ?? null;
  return null;
}

/** Resolve tenant org from Clerk session, verified headers, or dev demo fallback. */
export async function resolveOrganization(
  req?: FastifyRequest
): Promise<Organization | null> {
  if (req?.apiKeyAuth) {
    const byApiKey = await prisma.organization.findUnique({
      where: { id: req.apiKeyAuth.orgId },
    });
    if (byApiKey) return byApiKey;
  }

  if (req) {
    const auth = getClerkAuth(req);
    if (auth?.orgId) {
      const byClerk = await prisma.organization.findUnique({
        where: { clerkOrgId: auth.orgId },
      });
      if (byClerk) return byClerk;
      // Webhook lag / first connect, provision from the signed-in Clerk org.
      const provisioned = await ensureOrganizationFromSession(req);
      if (provisioned) return provisioned;
    }
  }

  const clerkOrgId = headerValue(req, "x-clerk-org-id");
  const slug = headerValue(req, "x-org-slug");
  // Allow org headers when the user is signed in (even before an active Clerk org is selected).
  const hasClerkUser = req ? Boolean(getClerkAuth(req)?.userId) : false;
  const hasBearer = Boolean(headerValue(req, "authorization")?.startsWith("Bearer "));
  const internal = req ? verifyInternalApiSecret(req) : false;
  const allowHeaders = !isAuthEnforced() || hasClerkUser || hasBearer || internal;

  const userId = req ? getClerkAuth(req)?.userId : undefined;

  if (allowHeaders && clerkOrgId) {
    const byClerk = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (byClerk) return byClerk;
  }

  // Prefer an org the signed-in user actually belongs to over a stale localStorage slug
  // (e.g. leftover `demo` while working in Optic Inc).
  if (userId) {
    const memberships = await prisma.member.findMany({
      where: { clerkId: userId },
      include: { org: true },
      take: 5,
    });
    if (memberships.length === 1 && memberships[0]?.org) {
      return memberships[0].org;
    }
    if (allowHeaders && slug && memberships.length > 0) {
      const bySlug = await findOrgBySlugHint(slug);
      const match = memberships.find((m) => m.orgId === bySlug?.id);
      if (match?.org) return match.org;
    }
    // Multiple memberships + Clerk org header already checked; try admin/owner first.
    if (memberships.length > 1) {
      const admin = memberships.find((m) => m.role === "OWNER" || m.role === "ADMIN");
      if (admin?.org) return admin.org;
    }
  }

  if (allowHeaders && slug) {
    const bySlug = await findOrgBySlugHint(slug);
    if (bySlug) {
      if (!userId) return bySlug;
      const member = await prisma.member.findUnique({
        where: { orgId_clerkId: { orgId: bySlug.id, clerkId: userId } },
      });
      // Ignore stale slug that points at an org the user cannot act in.
      if (member) return bySlug;
    }
  }

  if (isAuthEnforced()) {
    return null;
  }

  return prisma.organization.findFirst({ where: { slug: DEMO_ORG_SLUG } });
}

export async function requireOrganization(req?: FastifyRequest): Promise<Organization> {
  const org = await resolveOrganization(req);
  if (!org) {
    const err = new Error("Organization not found");
    (err as { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return org;
}
