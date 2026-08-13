import type { FastifyPluginAsync } from "fastify";
import type Stripe from "stripe";
import type { BillingStatus, Plan } from "@prisma/client";
import { ok, err } from "../lib/response.js";
import { prisma } from "../lib/prisma.js";
import {
  getStripe,
  intervalFromStripePrice,
  mapStripeSubscriptionStatus,
  planFromStripePrice,
  stripeEnabled,
} from "../lib/stripe.js";

const PAID_PLANS: Plan[] = ["SOLO", "STARTER", "GROWTH", "ENTERPRISE"];

function parsePlan(value: string | undefined | null): Plan | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return PAID_PLANS.includes(upper as Plan) ? (upper as Plan) : null;
}

async function applySubscriptionToOrg(params: {
  customerId?: string | null;
  orgId?: string | null;
  subscriptionId: string;
  plan: Plan;
  billingStatus: BillingStatus;
  billingInterval: string | null;
  currentPeriodEnd: Date | null;
}) {
  const data = {
    stripeSubscriptionId: params.subscriptionId,
    plan: params.plan,
    billingStatus: params.billingStatus,
    billingInterval: params.billingInterval,
    currentPeriodEnd: params.currentPeriodEnd,
    planSource: "STRIPE" as const,
    ...(params.customerId ? { stripeCustomerId: params.customerId } : {}),
  };

  if (params.customerId) {
    // Never overwrite MANUAL Enterprise comps that share no Stripe customer.
    const updated = await prisma.organization.updateMany({
      where: {
        stripeCustomerId: params.customerId,
        NOT: { planSource: "MANUAL", plan: "ENTERPRISE" },
      },
      data,
    });
    if (updated.count > 0) return;
  }

  if (params.orgId) {
    const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
    if (org?.planSource === "MANUAL" && org.plan === "ENTERPRISE") return;
    await prisma.organization.update({
      where: { id: params.orgId },
      data,
    });
  }
}

async function downgradeToFree(params: {
  customerId?: string | null;
  orgId?: string | null;
}) {
  const data = {
    plan: "FREE" as const,
    billingStatus: "CANCELED" as const,
    stripeSubscriptionId: null,
    billingInterval: null,
    currentPeriodEnd: null,
  };

  if (params.customerId) {
    await prisma.organization.updateMany({
      where: {
        stripeCustomerId: params.customerId,
        NOT: { planSource: "MANUAL" },
      },
      data: { ...data, billingStatus: "FREE" },
    });
    return;
  }

  if (params.orgId) {
    const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
    if (org?.planSource === "MANUAL") return;
    await prisma.organization.update({
      where: { id: params.orgId },
      data: { ...data, billingStatus: "FREE" },
    });
  }
}

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
        const orgId = session.metadata?.orgId ?? null;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id ?? "";
          const plan =
            planFromStripePrice(priceId) ??
            parsePlan(session.metadata?.plan) ??
            parsePlan(sub.metadata?.plan);
          if (plan) {
            await applySubscriptionToOrg({
              customerId,
              orgId,
              subscriptionId: sub.id,
              plan,
              billingStatus: mapStripeSubscriptionStatus(sub.status),
              billingInterval: intervalFromStripePrice(priceId) ?? session.metadata?.interval ?? null,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
          }
        } else if (orgId && customerId) {
          await prisma.organization.update({
            where: { id: orgId },
            data: { stripeCustomerId: customerId },
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
        const priceId = sub.items.data[0]?.price?.id ?? "";
        const plan =
          planFromStripePrice(priceId) ?? parsePlan(sub.metadata?.plan);
        const orgId = sub.metadata?.orgId ?? null;

        if (plan && (customerId || orgId)) {
          await applySubscriptionToOrg({
            customerId,
            orgId,
            subscriptionId: sub.id,
            plan,
            billingStatus: mapStripeSubscriptionStatus(sub.status),
            billingInterval: intervalFromStripePrice(priceId),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const orgId = sub.metadata?.orgId ?? null;
        await downgradeToFree({ customerId, orgId });
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await prisma.organization.updateMany({
            where: {
              stripeCustomerId: customerId,
              NOT: { planSource: "MANUAL" },
            },
            data: { billingStatus: "PAST_DUE" },
          });
        }
      }

      return reply.send(ok({ received: true }));
    },
  });
};
