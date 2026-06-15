import type { Role } from "@prisma/client";

/** Clerk organization role keys — must match Clerk dashboard per environment. */
export const CLERK_ROLE_MEMBER = "org:member";
export const CLERK_ROLE_ADMIN = "org:admin";
export const CLERK_ROLE_AUDITOR = "org:auditor";

export const INVITE_TTL_DAYS = 7;

export function mapClerkRole(clerkRole: string | undefined): Role {
  const role = (clerkRole ?? "").toLowerCase();
  if (role.includes("admin")) return "ADMIN";
  if (role.includes("auditor")) return "AUDITOR";
  return "MEMBER";
}

export function parseInviteRole(input?: string): Role {
  const normalized = (input ?? "MEMBER").toUpperCase();
  if (normalized === "AUDITOR") return "AUDITOR";
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "OWNER") return "OWNER";
  return "MEMBER";
}

export function toClerkRole(role: Role): string {
  switch (role) {
    case "AUDITOR":
      return CLERK_ROLE_AUDITOR;
    case "ADMIN":
    case "OWNER":
      return CLERK_ROLE_ADMIN;
    default:
      return CLERK_ROLE_MEMBER;
  }
}

export function isPendingInviteActive(invite: {
  acceptedAt: Date | null;
  expiresAt: Date;
}): boolean {
  return !invite.acceptedAt && invite.expiresAt > new Date();
}

/** Bootstrap role when webhook has not synced yet. Expired pending invites are ignored. */
export function resolveMemberRoleFromInvite(
  clerkOrgRole: string | undefined,
  pending: { role: Role; acceptedAt: Date | null; expiresAt: Date } | null
): Role {
  const fromClerk = mapClerkRole(clerkOrgRole);
  if (fromClerk === "AUDITOR" || fromClerk === "ADMIN") {
    return fromClerk;
  }
  if (pending && isPendingInviteActive(pending)) {
    return pending.role;
  }
  return fromClerk;
}
