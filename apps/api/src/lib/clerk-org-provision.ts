import type { FastifyRequest } from "fastify";
import type { Organization } from "@prisma/client";
import { getClerkAuth } from "./auth.js";
import { prisma } from "./prisma.js";

function clerkOrgSlugBase(name: string, claimSlug?: string): string {
  if (claimSlug?.trim()) {
    return claimSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "organization"
  );
}

/** Create or update Shieldoq org row from Clerk session (when webhooks lag or are unset). */
export async function ensureOrganizationFromSession(
  req: FastifyRequest
): Promise<Organization | null> {
  const auth = getClerkAuth(req);
  if (!auth?.orgId) return null;

  const existing = await prisma.organization.findUnique({
    where: { clerkOrgId: auth.orgId },
  });
  if (existing) return existing;

  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  const authOrgSlug = (auth as { orgSlug?: string | null }).orgSlug;
  const name =
    (typeof claims?.org_name === "string" && claims.org_name.trim()) ||
    (typeof authOrgSlug === "string" && authOrgSlug.trim()) ||
    "Organization";
  const claimSlug =
    (typeof claims?.org_slug === "string" && claims.org_slug) ||
    (typeof authOrgSlug === "string" ? authOrgSlug : undefined);
  const base = clerkOrgSlugBase(name, claimSlug);
  const slug = `${base}-${auth.orgId.slice(-6)}`;

  const org = await prisma.organization.upsert({
    where: { clerkOrgId: auth.orgId },
    update: { name },
    create: {
      clerkOrgId: auth.orgId,
      name,
      slug,
      plan: "FREE",
    },
  });

  // Framework enrollment is driven by onboarding framework selection, not auto-provisioned here.

  return org;
}

/** OAuth callbacks have no Clerk session, provision org from state when webhooks lag. */
export async function ensureOrganizationFromClerkId(
  clerkOrgId: string,
  slugHint?: string | null
): Promise<Organization> {
  const clerkId = clerkOrgId.trim();
  const existing = await prisma.organization.findUnique({ where: { clerkOrgId: clerkId } });
  if (existing) return existing;

  const base = clerkOrgSlugBase(slugHint?.trim() || "organization", slugHint ?? undefined);
  const slug = `${base}-${clerkId.slice(-6)}`;

  return prisma.organization.upsert({
    where: { clerkOrgId: clerkId },
    update: {},
    create: {
      clerkOrgId: clerkId,
      name: slugHint?.trim() || "Organization",
      slug,
      plan: "FREE",
    },
  });
}
