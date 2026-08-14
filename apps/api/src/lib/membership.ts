import type { FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { getClerkAuth, isAuthEnforced } from "./auth.js";
import {
  ensureOrganizationFromClerkId,
  ensureOrganizationFromSession,
} from "./clerk-org-provision.js";
import { prisma } from "./prisma.js";
import { mapClerkRole, resolveMemberRoleFromInvite } from "./clerk-roles.js";
import { findActivePendingInvite } from "./pending-invite.js";

function headerValue(req: FastifyRequest, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return typeof v === "string" ? v : undefined;
}

function resolveClerkOrgId(req: FastifyRequest): string | undefined {
  const auth = getClerkAuth(req);
  return auth?.orgId ?? headerValue(req, "x-clerk-org-id") ?? undefined;
}

const BOOTSTRAP_PATHS = [
  "/api/v1/onboarding/status",
  "/api/v1/onboarding/ensure-membership",
  "/api/v1/onboarding/repositories",
  "/api/v1/onboarding/sync-repositories",
  "/api/v1/onboarding/repository-selection",
  "/api/v1/onboarding/framework-selection",
  "/api/v1/onboarding/lite-scan",
  "/api/v1/onboarding/lite-scan/status",
];

export function isMembershipBootstrapPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return BOOTSTRAP_PATHS.some((p) => path === p);
}

/** True when the signed-in Clerk user has an active Member row for the session org. */
export async function hasActiveMembership(req: FastifyRequest): Promise<boolean> {
  if (!isAuthEnforced()) return true;

  const auth = getClerkAuth(req);
  if (!auth?.userId) return true;
  if (!auth.orgId) return true;

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: auth.orgId },
  });
  if (!org) return false;

  const member = await prisma.member.findUnique({
    where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
  });
  return Boolean(member);
}

/** Idempotent bootstrap when Clerk membership webhook has not arrived yet. */
export async function ensureMembershipFromSession(req: FastifyRequest): Promise<{
  orgReady: boolean;
  memberReady: boolean;
  orgSlug?: string;
  needsClerkOrg?: boolean;
}> {
  const auth = getClerkAuth(req);
  if (!auth?.userId) {
    return { orgReady: false, memberReady: false };
  }

  const clerkOrgId = resolveClerkOrgId(req);
  if (!clerkOrgId) {
    return { orgReady: false, memberReady: false, needsClerkOrg: true };
  }

  const org =
    (await prisma.organization.findUnique({
      where: { clerkOrgId },
    })) ??
    (auth.orgId
      ? await ensureOrganizationFromSession(req)
      : await ensureOrganizationFromClerkId(
          clerkOrgId,
          headerValue(req, "x-org-slug")
        ));
  if (!org) {
    return { orgReady: false, memberReady: false };
  }

  const existing = await prisma.member.findUnique({
    where: { orgId_clerkId: { orgId: org.id, clerkId: auth.userId } },
  });
  if (existing) {
    // Keep Shieldoq role aligned with Clerk org role (admin connects integrations).
    const mapped = mapClerkRole((auth as { orgRole?: string }).orgRole);
    if (
      (mapped === "ADMIN" || mapped === "OWNER") &&
      existing.role !== "ADMIN" &&
      existing.role !== "OWNER"
    ) {
      await prisma.member.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
    }
    return { orgReady: true, memberReady: true, orgSlug: org.slug };
  }

  const sessionClaims = auth.sessionClaims as Record<string, unknown> | undefined;
  const email =
    (typeof sessionClaims?.email === "string" && sessionClaims.email) ||
    (typeof sessionClaims?.primary_email_address === "string" &&
      sessionClaims.primary_email_address) ||
    `${auth.userId}@users.clerk`;
  const normalizedEmail = email.toLowerCase();
  const name =
    (typeof sessionClaims?.full_name === "string" && sessionClaims.full_name) ||
    (typeof sessionClaims?.first_name === "string" && sessionClaims.first_name) ||
    normalizedEmail.split("@")[0] ||
    "Member";

  const pending = await findActivePendingInvite(org.id, normalizedEmail);
  const role: Role = resolveMemberRoleFromInvite(
    (auth as { orgRole?: string }).orgRole,
    pending
  );

  try {
    await prisma.member.create({
      data: {
        orgId: org.id,
        clerkId: auth.userId,
        email: normalizedEmail,
        name,
        role,
      },
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code !== "P2002") throw e;
  }

  return { orgReady: true, memberReady: true, orgSlug: org.slug };
}

async function resolveGitConnection(orgId: string): Promise<{
  gitConnected: boolean;
  gitAuthMethod: "app" | "oauth" | null;
}> {
  const integration = await prisma.integration.findFirst({
    where: { orgId, category: "GIT", isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { metadata: true, provider: true },
  });
  if (!integration) return { gitConnected: false, gitAuthMethod: null };

  const meta =
    integration.metadata &&
    typeof integration.metadata === "object" &&
    !Array.isArray(integration.metadata)
      ? (integration.metadata as { installationId?: number; oauth?: boolean })
      : {};

  const gitAuthMethod =
    meta.installationId != null ? "app" : meta.oauth ? "oauth" : null;

  return { gitConnected: true, gitAuthMethod };
}

export async function getOnboardingStatus(req: FastifyRequest): Promise<{
  mode: "dev" | "clerk";
  orgReady: boolean;
  memberReady: boolean;
  orgSlug?: string;
  needsClerkOrg?: boolean;
  gitConnected?: boolean;
  gitAuthMethod?: "app" | "oauth" | null;
}> {
  if (!isAuthEnforced()) {
    const slug = process.env.VIKELA_DEV_ORG_SLUG ?? "demo";
    const org = await prisma.organization.findFirst({ where: { slug } });
    const git = org ? await resolveGitConnection(org.id) : { gitConnected: false, gitAuthMethod: null };
    return {
      mode: "dev",
      orgReady: Boolean(org),
      memberReady: true,
      orgSlug: org?.slug ?? slug,
      ...git,
    };
  }

  const auth = getClerkAuth(req);
  if (!auth?.userId) {
    return { mode: "clerk", orgReady: false, memberReady: false };
  }

  const clerkOrgId = resolveClerkOrgId(req);
  if (!clerkOrgId) {
    return {
      mode: "clerk",
      orgReady: false,
      memberReady: false,
      needsClerkOrg: true,
    };
  }

  const ensured = await ensureMembershipFromSession(req);
  if (!ensured.orgReady || !ensured.orgSlug) {
    return {
      mode: "clerk",
      orgReady: false,
      memberReady: false,
      needsClerkOrg: ensured.needsClerkOrg,
    };
  }

  const org = await prisma.organization.findUnique({
    where: { slug: ensured.orgSlug },
  });
  const git = org
    ? await resolveGitConnection(org.id)
    : { gitConnected: false, gitAuthMethod: null as "app" | "oauth" | null };

  return {
    mode: "clerk",
    orgReady: true,
    memberReady: Boolean(ensured.memberReady),
    orgSlug: ensured.orgSlug,
    ...git,
  };
}

export { mapClerkRole };
