import type { FastifyPluginAsync } from "fastify";
import type Stripe from "stripe";
import { ok, err } from "../lib/response.js";
import { prisma } from "../lib/prisma.js";
import { getStripe, planFromStripePrice, stripeEnabled } from "../lib/stripe.js";

export const stripeWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/stripe", {
    config: { rawBody: true },
    handler: async (req, reply) => {
      if (!stripeEnabled()) {
        return reply.status(500).send(err("Stripe not configured"));
      }

      const stripe = await getStripe();
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        return reply.status(500).send(err("STRIPE_WEBHOOK_SECRET not configured"));
      }

      const sig = req.headers["stripe-signature"] as string | undefined;
      const rawBody = (req as { rawBody?: string }).rawBody ?? "";
      if (!sig) {
        return reply.status(400).send(err("Missing stripe-signature"));
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      } catch (e) {
        return reply
          .status(400)
          .send(err(e instanceof Error ? e.message : "Invalid signature"));
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const planKey = session.metadata?.plan as string | undefined;

        if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              ...(customerId ? { stripeCustomerId: customerId } : {}),
              ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
              ...(planKey && ["STARTER", "GROWTH", "ENTERPRISE"].includes(planKey)
                ? { plan: planKey as "STARTER" | "GROWTH" | "ENTERPRISE" }
                : {}),
            },
          });
        }
      }

      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.created"
      ) {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const priceId = sub.items.data[0]?.price?.id;
        const planFromPrice = priceId ? planFromStripePrice(priceId) : null;
        const planFromMeta = sub.metadata?.plan;
        const plan =
          planFromPrice ??
          (planFromMeta && ["STARTER", "GROWTH", "ENTERPRISE"].includes(planFromMeta)
            ? (planFromMeta as "STARTER" | "GROWTH" | "ENTERPRISE")
            : null);
        const orgId = sub.metadata?.orgId;

        if (customerId && plan) {
          await prisma.organization.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              stripeSubscriptionId: sub.id,
              plan,
            },
          });
        } else if (orgId && plan) {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              ...(customerId ? { stripeCustomerId: customerId } : {}),
              stripeSubscriptionId: sub.id,
              plan,
            },
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const orgId = sub.metadata?.orgId;
        if (customerId) {
          await prisma.organization.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        } else if (orgId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        }
      }

      return reply.send(ok({ received: true }));
    },
  });
};
