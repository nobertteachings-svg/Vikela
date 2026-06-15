import type { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { INVITE_TTL_DAYS, isPendingInviteActive } from "./clerk-roles.js";

export function inviteExpiresAt(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_TTL_DAYS);
  return expires;
}

export async function findActivePendingInvite(orgId: string, email: string) {
  const pending = await prisma.pendingInvite.findUnique({
    where: { orgId_email: { orgId, email: email.toLowerCase() } },
  });
  if (!pending || !isPendingInviteActive(pending)) return null;
  return pending;
}

export async function upsertPendingInvite(input: {
  orgId: string;
  email: string;
  role: Role;
  clerkInvitationId?: string | null;
}) {
  const email = input.email.toLowerCase();
  const expiresAt = inviteExpiresAt();
  return prisma.pendingInvite.upsert({
    where: { orgId_email: { orgId: input.orgId, email } },
    update: {
      role: input.role,
      clerkInvitationId: input.clerkInvitationId ?? undefined,
      expiresAt,
      acceptedAt: null,
    },
    create: {
      orgId: input.orgId,
      email,
      role: input.role,
      clerkInvitationId: input.clerkInvitationId ?? undefined,
      expiresAt,
    },
  });
}

export async function markPendingInviteAccepted(orgId: string, email: string) {
  await prisma.pendingInvite.updateMany({
    where: { orgId, email: email.toLowerCase(), acceptedAt: null },
    data: { acceptedAt: new Date() },
  });
}

export async function listActivePendingInvites(orgId: string) {
  return prisma.pendingInvite.findMany({
    where: {
      orgId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
