import type { FastifyRequest } from "fastify";
import type { Organization } from "@prisma/client";
import { getClerkAuth, isAuthEnforced, verifyInternalApiSecret } from "./auth.js";
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
    }
  }

  const clerkOrgId = headerValue(req, "x-clerk-org-id");
  const slug = headerValue(req, "x-org-slug");
  const hasClerkSession = req ? Boolean(getClerkAuth(req)?.orgId) : false;
  const internal = req ? verifyInternalApiSecret(req) : false;
  const allowHeaders =
    !isAuthEnforced() || hasClerkSession || internal;

  if (allowHeaders && clerkOrgId) {
    const byClerk = await prisma.organization.findUnique({
      where: { clerkOrgId },
    });
    if (byClerk) return byClerk;
  }

  if (allowHeaders && slug) {
    const bySlug = await prisma.organization.findUnique({ where: { slug } });
    if (bySlug) return bySlug;
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
