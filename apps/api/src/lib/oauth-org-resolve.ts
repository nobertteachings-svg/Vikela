import type { Organization } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Resolve Vikela org from OAuth state slug and optional Clerk org id fallback. */
export async function resolveOAuthOrganization(
  orgSlug: string | null | undefined,
  clerkOrgId?: string | null
): Promise<Organization | null> {
  const slug = orgSlug?.trim();
  if (slug) {
    const bySlug = await prisma.organization.findFirst({ where: { slug } });
    if (bySlug) return bySlug;
  }

  const clerkId = clerkOrgId?.trim();
  if (clerkId) {
    return prisma.organization.findUnique({ where: { clerkOrgId: clerkId } });
  }

  return null;
}
