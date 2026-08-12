import type { FastifyPluginAsync } from "fastify";
import { verifyWebhook } from "@clerk/fastify/webhooks";
import { ok, err } from "../lib/response.js";
import { prisma } from "../lib/prisma.js";
import { resolveMemberRoleFromInvite } from "../lib/clerk-roles.js";
import { markPendingInviteAccepted, findActivePendingInvite } from "../lib/pending-invite.js";
import { captureProductEvent } from "../lib/product-events.js";

type ClerkOrgEvent = {
  type: string;
  data: {
    id: string;
    name?: string;
    slug?: string;
  };
};

type ClerkMembershipEvent = {
  type: string;
  data: {
    id: string;
    role: string;
    organization: { id: string; name?: string; slug?: string };
    public_user_data: {
      user_id: string;
      first_name?: string | null;
      last_name?: string | null;
      identifier?: string | null;
    };
  };
};

function memberName(data: ClerkMembershipEvent["data"]): string {
  const first = data.public_user_data.first_name?.trim() ?? "";
  const last = data.public_user_data.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return data.public_user_data.identifier ?? "Member";
}

async function syncMembership(
  event: ClerkMembershipEvent,
  membershipEventType: string
): Promise<{ memberId: string } | null> {
  const clerkOrgId = event.data.organization.id;
  const clerkUserId = event.data.public_user_data.user_id;
  const email = (event.data.public_user_data.identifier ?? `${clerkUserId}@clerk.user`).toLowerCase();

  const org = await prisma.organization.findUnique({ where: { clerkOrgId } });
  if (!org) return null;

  const pending = await findActivePendingInvite(org.id, email);
  const role = resolveMemberRoleFromInvite(event.data.role, pending);
  const wasAuditor = pending?.role === "AUDITOR" || role === "AUDITOR";

  const member = await prisma.member.upsert({
    where: { orgId_clerkId: { orgId: org.id, clerkId: clerkUserId } },
    update: { email, name: memberName(event.data), role },
    create: {
      orgId: org.id,
      clerkId: clerkUserId,
      email,
      name: memberName(event.data),
      role,
    },
  });

  await markPendingInviteAccepted(org.id, email);

  if (wasAuditor && membershipEventType === "organizationMembership.created") {
    captureProductEvent(
      "auditor_invite_accepted",
      { orgId: org.id, email, role: pending!.role },
      { distinctId: clerkUserId, orgId: org.id }
    );
  }

  return { memberId: member.id };
}

export const clerkWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/clerk", async (req, reply) => {
    // @clerk/backend verifyWebhook reads CLERK_WEBHOOK_SIGNING_SECRET;
    // accept our existing CLERK_WEBHOOK_SECRET alias used across Vikela env docs.
    const secret =
      process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim() ||
      process.env.CLERK_WEBHOOK_SECRET?.trim();
    if (secret && !process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = secret;
    }
    let event: ClerkOrgEvent | ClerkMembershipEvent;

    if (secret) {
      try {
        const verified = await verifyWebhook(req);
        event = verified as unknown as ClerkOrgEvent;
      } catch (e) {
        return reply
          .status(401)
          .send(err(e instanceof Error ? e.message : "Invalid webhook signature"));
      }
    } else if (process.env.NODE_ENV === "production") {
      return reply.status(500).send(err("CLERK_WEBHOOK_SECRET not configured"));
    } else {
      event = req.body as ClerkOrgEvent;
    }

    if (event.type === "organization.created" || event.type === "organization.updated") {
      const orgEvent = event as ClerkOrgEvent;
      const clerkOrgId = orgEvent.data.id;
      const name = orgEvent.data.name ?? "Organization";
      const slug =
        orgEvent.data.slug ??
        (name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48) || clerkOrgId);

      const org = await prisma.organization.upsert({
        where: { clerkOrgId },
        update: { name, slug },
        create: {
          clerkOrgId,
          name,
          slug: `${slug}-${clerkOrgId.slice(-6)}`,
          plan: "FREE",
        },
      });

      // Framework enrollment happens during onboarding — not at org creation.

      return reply.send(ok({ orgId: org.id, slug: org.slug }));
    }

    if (
      event.type === "organizationMembership.created" ||
      event.type === "organizationMembership.updated"
    ) {
      const result = await syncMembership(event as ClerkMembershipEvent, event.type);
      if (!result) {
        return reply.status(202).send(ok({ received: true, synced: false, reason: "org_not_found" }));
      }
      return reply.send(ok({ synced: true, memberId: result.memberId }));
    }

    if (event.type === "organizationMembership.deleted") {
      const membership = event as ClerkMembershipEvent;
      const org = await prisma.organization.findUnique({
        where: { clerkOrgId: membership.data.organization.id },
      });
      if (org) {
        await prisma.member.deleteMany({
          where: {
            orgId: org.id,
            clerkId: membership.data.public_user_data.user_id,
          },
        });
      }
      return reply.send(ok({ deleted: true }));
    }

    return reply.send(ok({ received: true, type: event.type }));
  });
};
