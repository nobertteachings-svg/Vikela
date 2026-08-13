import type { FastifyPluginAsync } from "fastify";
import type { Role } from "@prisma/client";
import { clerkClient } from "@clerk/fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization, requireOrganization } from "../lib/org-context.js";
import {
  getMemberForRequest,
  requireAdmin,
  requireRead,
} from "../lib/authorization.js";
import { assertCanInviteMember } from "../lib/plan-limits.js";
import { assertBillingAllowsUsage } from "../lib/plan-features.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { requireApiAuth, getClerkAuth } from "../lib/auth.js";
import { parseInviteRole, toClerkRole } from "../lib/clerk-roles.js";
import { clerkInviteHttpError } from "../lib/clerk-invite-errors.js";
import {
  listActivePendingInvites,
  upsertPendingInvite,
  findActivePendingInvite,
} from "../lib/pending-invite.js";
import { captureProductEvent } from "../lib/product-events.js";
import { getAppUrl } from "../lib/app-url.js";

const MANAGEABLE_ROLES: Role[] = ["ADMIN", "MEMBER", "AUDITOR"];

function serializeMember(m: {
  id: string;
  name: string;
  email: string;
  role: Role;
  clerkId: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    clerkId: m.clerkId,
    createdAt: m.createdAt.toISOString(),
  };
}

async function countAdmins(orgId: string): Promise<number> {
  return prisma.member.count({
    where: { orgId, role: { in: ["OWNER", "ADMIN"] } },
  });
}

export const membersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/members", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const members = await prisma.member.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "asc" },
    });

    return reply.send(ok(members.map(serializeMember)));
  });

  app.get("/members/invites", async (req, reply) => {
    try {
      await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const invites = await listActivePendingInvites(org.id);
    return reply.send(
      ok(
        invites.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
          clerkInvitationId: inv.clerkInvitationId,
        }))
      )
    );
  });

  app.post("/members/invite", async (req, reply) => {
    let actor;
    try {
      actor = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const body = req.body as { email?: string; role?: string };
    if (!body.email?.trim()) {
      return reply.status(400).send(err("email is required"));
    }

    const email = body.email.trim().toLowerCase();
    const role = parseInviteRole(body.role);

    if (role === "OWNER") {
      return reply.status(400).send(err("Cannot invite with OWNER role"));
    }
    if (!MANAGEABLE_ROLES.includes(role)) {
      return reply.status(400).send(err("Invalid role"));
    }

    const existingMember = await prisma.member.findFirst({
      where: { orgId: org.id, email: { equals: email, mode: "insensitive" } },
    });
    if (existingMember) {
      return reply.status(409).send(err("That email already belongs to a workspace member"));
    }

    const existingInvite = await findActivePendingInvite(org.id, email);
    if (existingInvite) {
      return reply
        .status(409)
        .send(err("An active invite already exists for that email. Resend or revoke it instead."));
    }

    try {
      assertBillingAllowsUsage(org);
      await assertCanInviteMember(org.id, org.plan);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
    }

    if (!process.env.CLERK_SECRET_KEY) {
      return reply
        .status(503)
        .send(err("Clerk is not configured (CLERK_SECRET_KEY). Cannot send invitations."));
    }

    let userId: string;
    try {
      ({ userId } = requireApiAuth(req));
    } catch {
      return reply.status(401).send(err("Sign in required to send invitations"));
    }

    let clerkInvitationId: string;
    try {
      const invitation = await clerkClient.organizations.createOrganizationInvitation({
        organizationId: org.clerkOrgId,
        inviterUserId: userId,
        emailAddress: email,
        role: toClerkRole(role),
        redirectUrl: `${getAppUrl()}/dashboard`,
      });
      clerkInvitationId = invitation.id;
    } catch (inviteErr) {
      const mapped = clerkInviteHttpError(inviteErr);
      if (mapped) {
        return reply.status(mapped.status).send(err(mapped.message));
      }
      throw inviteErr;
    }

    const pending = await upsertPendingInvite({
      orgId: org.id,
      email,
      role,
      clerkInvitationId,
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: actor?.id,
      action: "member.invited",
      target: email,
      metadata: { role, clerkInvitationSent: true },
    });

    if (role === "AUDITOR") {
      const auth = getClerkAuth(req);
      if (auth?.userId) {
        captureProductEvent(
          "auditor_invited",
          { orgId: org.id, email, role },
          { distinctId: auth.userId, orgId: org.id }
        );
      }
    }

    return reply.send(
      ok({
        id: pending.id,
        email,
        role,
        expiresAt: pending.expiresAt.toISOString(),
        clerkInvitationSent: true,
      })
    );
  });

  app.post("/members/invites/:id/resend", async (req, reply) => {
    let actor;
    try {
      actor = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    if (!process.env.CLERK_SECRET_KEY) {
      return reply.status(503).send(err("Clerk is not configured"));
    }

    const { id } = req.params as { id: string };
    const pending = await prisma.pendingInvite.findFirst({
      where: { id, orgId: org.id, acceptedAt: null },
    });
    if (!pending) return reply.status(404).send(err("Invite not found"));
    if (pending.expiresAt <= new Date()) {
      return reply.status(400).send(err("Invite has expired — create a new invite"));
    }

    let userId: string;
    try {
      ({ userId } = requireApiAuth(req));
    } catch {
      return reply.status(401).send(err("Sign in required to resend invitations"));
    }

    // Best-effort revoke of the previous Clerk invitation before reissuing.
    if (pending.clerkInvitationId) {
      try {
        await clerkClient.organizations.revokeOrganizationInvitation({
          organizationId: org.clerkOrgId,
          invitationId: pending.clerkInvitationId,
          requestingUserId: userId,
        });
      } catch {
        /* may already be revoked/expired */
      }
    }

    let clerkInvitationId: string;
    try {
      const invitation = await clerkClient.organizations.createOrganizationInvitation({
        organizationId: org.clerkOrgId,
        inviterUserId: userId,
        emailAddress: pending.email,
        role: toClerkRole(pending.role),
        redirectUrl: `${getAppUrl()}/dashboard`,
      });
      clerkInvitationId = invitation.id;
    } catch (inviteErr) {
      const mapped = clerkInviteHttpError(inviteErr);
      if (mapped) {
        return reply.status(mapped.status).send(err(mapped.message));
      }
      throw inviteErr;
    }

    const updated = await upsertPendingInvite({
      orgId: org.id,
      email: pending.email,
      role: pending.role,
      clerkInvitationId,
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: actor?.id,
      action: "member.invite_resent",
      target: pending.email,
      metadata: { role: pending.role },
    });

    return reply.send(
      ok({
        id: updated.id,
        email: updated.email,
        role: updated.role,
        expiresAt: updated.expiresAt.toISOString(),
        clerkInvitationSent: true,
      })
    );
  });

  app.delete("/members/invites/:id", async (req, reply) => {
    let actor;
    try {
      actor = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const pending = await prisma.pendingInvite.findFirst({
      where: { id, orgId: org.id },
    });
    if (!pending) return reply.status(404).send(err("Invite not found"));

    if (process.env.CLERK_SECRET_KEY && pending.clerkInvitationId) {
      try {
        const { userId } = requireApiAuth(req);
        await clerkClient.organizations.revokeOrganizationInvitation({
          organizationId: org.clerkOrgId,
          invitationId: pending.clerkInvitationId,
          requestingUserId: userId,
        });
      } catch {
        /* invite may already be gone in Clerk, or no session for internal callers */
      }
    }

    await prisma.pendingInvite.delete({ where: { id: pending.id } });

    await logAuditEvent({
      orgId: org.id,
      actorId: actor?.id,
      action: "member.invite_revoked",
      target: pending.email,
      metadata: { role: pending.role },
    });

    return reply.send(ok({ deleted: true, id: pending.id, email: pending.email }));
  });

  app.patch("/members/:id", async (req, reply) => {
    let actor;
    try {
      actor = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const body = req.body as { role?: string };
    const role = parseInviteRole(body.role);
    if (role === "OWNER") {
      return reply.status(400).send(err("OWNER cannot be assigned via API"));
    }
    if (!MANAGEABLE_ROLES.includes(role)) {
      return reply.status(400).send(err("Invalid role"));
    }

    const target = await prisma.member.findFirst({ where: { id, orgId: org.id } });
    if (!target) return reply.status(404).send(err("Member not found"));

    if (target.role === "OWNER") {
      return reply.status(400).send(err("Cannot change the organization owner role here"));
    }

    const wasAdmin = target.role === "ADMIN";
    const willBeAdmin = role === "ADMIN";
    if (wasAdmin && !willBeAdmin) {
      const admins = await countAdmins(org.id);
      if (admins <= 1) {
        return reply.status(400).send(err("Cannot demote the last admin"));
      }
    }

    if (process.env.CLERK_SECRET_KEY) {
      try {
        await clerkClient.organizations.updateOrganizationMembership({
          organizationId: org.clerkOrgId,
          userId: target.clerkId,
          role: toClerkRole(role),
        });
      } catch (e) {
        const mapped = clerkInviteHttpError(e);
        if (mapped) {
          return reply.status(mapped.status).send(err(mapped.message));
        }
        throw e;
      }
    }

    const updated = await prisma.member.update({
      where: { id: target.id },
      data: { role },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: actor?.id,
      action: "member.role_changed",
      target: updated.email,
      metadata: { from: target.role, to: role },
    });

    return reply.send(ok(serializeMember(updated)));
  });

  app.delete("/members/:id", async (req, reply) => {
    let actor;
    try {
      actor = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const target = await prisma.member.findFirst({ where: { id, orgId: org.id } });
    if (!target) return reply.status(404).send(err("Member not found"));

    const me = actor ?? (await getMemberForRequest(req));
    if (me && me.id === target.id) {
      return reply.status(400).send(err("You cannot remove yourself"));
    }

    if (target.role === "OWNER") {
      return reply.status(400).send(err("Cannot remove the organization owner"));
    }

    if (target.role === "ADMIN") {
      const admins = await countAdmins(org.id);
      if (admins <= 1) {
        return reply.status(400).send(err("Cannot remove the last admin"));
      }
    }

    if (process.env.CLERK_SECRET_KEY) {
      try {
        await clerkClient.organizations.deleteOrganizationMembership({
          organizationId: org.clerkOrgId,
          userId: target.clerkId,
        });
      } catch (e) {
        const mapped = clerkInviteHttpError(e);
        if (mapped) {
          return reply.status(mapped.status).send(err(mapped.message));
        }
        // If Clerk membership is already gone, still delete locally.
      }
    }

    await prisma.member.delete({ where: { id: target.id } });

    await logAuditEvent({
      orgId: org.id,
      actorId: actor?.id,
      action: "member.removed",
      target: target.email,
      metadata: { role: target.role },
    });

    return reply.send(ok({ deleted: true, id: target.id, email: target.email }));
  });
};
