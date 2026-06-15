import type { FastifyPluginAsync } from "fastify";
import { clerkClient } from "@clerk/fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization, requireOrganization } from "../lib/org-context.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { assertCanInviteMember } from "../lib/plan-limits.js";
import { logAuditEvent } from "../lib/audit-log.js";
import { requireApiAuth, getClerkAuth } from "../lib/auth.js";
import { parseInviteRole, toClerkRole } from "../lib/clerk-roles.js";
import { clerkInviteHttpError } from "../lib/clerk-invite-errors.js";
import { listActivePendingInvites, upsertPendingInvite, findActivePendingInvite } from "../lib/pending-invite.js";
import { captureProductEvent } from "../lib/product-events.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export const membersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/members", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const members = await prisma.member.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "asc" },
    });

    return reply.send(
      ok(
        members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          createdAt: m.createdAt.toISOString(),
        }))
      )
    );
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
        }))
      )
    );
  });

  app.post("/members/invite", async (req, reply) => {
    let member;
    try {
      member = await requireAdmin(req);
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

    try {
      await assertCanInviteMember(org.id, org.plan);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
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

    let clerkInvitationId: string | undefined;
    let clerkInvitationSent = false;

    if (process.env.CLERK_SECRET_KEY) {
      const { userId } = requireApiAuth(req);
      try {
        const invitation = await clerkClient.organizations.createOrganizationInvitation({
          organizationId: org.clerkOrgId,
          inviterUserId: userId,
          emailAddress: email,
          role: toClerkRole(role),
          redirectUrl: `${APP_URL}/dashboard`,
        });
        clerkInvitationId = invitation.id;
        clerkInvitationSent = true;
      } catch (inviteErr) {
        const mapped = clerkInviteHttpError(inviteErr);
        if (mapped) {
          return reply.status(mapped.status).send(err(mapped.message));
        }
        throw inviteErr;
      }
    }

    const pending = await upsertPendingInvite({
      orgId: org.id,
      email,
      role,
      clerkInvitationId,
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "member.invited",
      target: email,
      metadata: { role, clerkInvitationSent },
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
        clerkInvitationSent,
      })
    );
  });
};
