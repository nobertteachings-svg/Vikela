import type { FastifyPluginAsync } from "fastify";
import type { Plan } from "@prisma/client";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { prisma } from "../lib/prisma.js";
import {
  getStripe,
  isStripeBillablePlan,
  priceIdForPlan,
  stripeEnabled,
  type BillingInterval,
} from "../lib/stripe.js";
import { getOrgUsage, getPlanLimits } from "../lib/plan-limits.js";
import { planHasFeature } from "../lib/plan-features.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";
import { getAppUrl } from "../lib/app-url.js";

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  SOLO: "Solo",
  STARTER: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
};

function defaultBillingStatus(org: {
  plan: Plan;
  billingStatus: string;
  stripeSubscriptionId: string | null;
}): string {
  if (org.billingStatus && org.billingStatus !== "FREE") {
    return org.billingStatus.toLowerCase();
  }
  if (org.stripeSubscriptionId) return "active";
  return org.plan === "FREE" ? "free" : "comped";
}

/** Prefer browser Origin so local checkout returns to localhost, not a stale APP_URL tunnel. */
function billingReturnBase(req: { headers: { origin?: string | string[] } }): string {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin.replace(/\/+$/, "");
  }
  return getAppUrl();
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/billing", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const usage = await getOrgUsage(org.id, org.plan);
    const limits = getPlanLimits(org.plan);

    let invoices: Array<{
      id: string;
      date: string;
      amount: string;
      status: string;
      pdfUrl: string | null;
    }> = [];
    let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null =
      null;
    let subscriptionStatus = defaultBillingStatus(org);
    let renewalDate: string | null = org.currentPeriodEnd?.toISOString() ?? null;
    let renewalAmountCents: number | null = null;
    let billingEmail: string | null = null;
    let billingCycle = org.billingInterval === "annual" ? "annual" : "monthly";

    if (stripeEnabled()) {
      try {
        const stripe = await getStripe();

        if (org.stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId, {
            expand: ["default_payment_method"],
          });
          subscriptionStatus = sub.status;
          renewalDate = new Date(sub.current_period_end * 1000).toISOString();
          renewalAmountCents = sub.items.data[0]?.price?.unit_amount ?? null;
          const interval = sub.items.data[0]?.price?.recurring?.interval;
          if (interval === "year") billingCycle = "annual";
          if (interval === "month") billingCycle = "monthly";

          const subPm = sub.default_payment_method;
          if (subPm && typeof subPm !== "string" && subPm.type === "card" && subPm.card) {
            paymentMethod = {
              brand: subPm.card.brand,
              last4: subPm.card.last4 ?? "****",
              expMonth: subPm.card.exp_month,
              expYear: subPm.card.exp_year,
            };
          }

          const customerRef = sub.customer;
          if (customerRef) {
            const customer =
              typeof customerRef === "string"
                ? await stripe.customers.retrieve(customerRef)
                : customerRef;
            if (customer && !("deleted" in customer && customer.deleted)) {
              billingEmail = customer.email ?? null;
            }
          }
        }

        if (org.stripeCustomerId) {
          const stripeInvoices = await stripe.invoices.list({
            customer: org.stripeCustomerId,
            limit: 12,
          });
          invoices = stripeInvoices.data.map((inv) => ({
            id: inv.number ?? inv.id,
            date: new Date((inv.created ?? 0) * 1000).toISOString().slice(0, 10),
            amount: `$${((inv.amount_paid ?? inv.amount_due ?? 0) / 100).toFixed(2)}`,
            status: inv.status ?? "unknown",
            pdfUrl: inv.invoice_pdf ?? null,
          }));

          const customer = await stripe.customers.retrieve(org.stripeCustomerId, {
            expand: ["invoice_settings.default_payment_method"],
          });
          if (!customer.deleted) {
            if (!billingEmail && customer.email) {
              billingEmail = customer.email;
            }
            const defaultPm = customer.invoice_settings?.default_payment_method;
            if (
              !paymentMethod &&
              defaultPm &&
              typeof defaultPm !== "string" &&
              defaultPm.type === "card" &&
              defaultPm.card
            ) {
              paymentMethod = {
                brand: defaultPm.card.brand,
                last4: defaultPm.card.last4 ?? "****",
                expMonth: defaultPm.card.exp_month,
                expYear: defaultPm.card.exp_year,
              };
            }
          }

          if (!paymentMethod) {
            const cards = await stripe.paymentMethods.list({
              customer: org.stripeCustomerId,
              type: "card",
              limit: 1,
            });
            const cardPm = cards.data[0];
            if (cardPm?.card) {
              paymentMethod = {
                brand: cardPm.card.brand,
                last4: cardPm.card.last4 ?? "****",
                expMonth: cardPm.card.exp_month,
                expYear: cardPm.card.exp_year,
              };
            }
          }
        }
      } catch {
        // Stripe optional — return DB-backed fields if API fails
      }
    }

    return reply.send(
      ok({
        orgName: org.name,
        plan: org.plan,
        planLabel: PLAN_LABELS[org.plan] ?? org.plan,
        status: subscriptionStatus,
        billingStatus: org.billingStatus,
        planSource: org.planSource,
        seats: usage.seats,
        billingCycle,
        renewalDate,
        nextInvoiceDate: renewalDate ? renewalDate.slice(0, 10) : null,
        renewalAmountCents,
        billingEmail,
        paymentMethod,
        stripeConfigured: stripeEnabled(),
        stripeCustomerId: org.stripeCustomerId,
        hasStripeSubscription: Boolean(org.stripeSubscriptionId),
        features: {
          frameworkDashboards: planHasFeature(org.plan, "framework_dashboards"),
          copilot: planHasFeature(org.plan, "copilot"),
          policyGenerator: planHasFeature(org.plan, "policy_generator"),
          evidenceExports: planHasFeature(org.plan, "evidence_exports"),
          questionnaires: planHasFeature(org.plan, "questionnaires"),
        },
        usage: {
          integrations: usage.integrations,
          scans: usage.scans,
          evidence: usage.evidence,
          storageMb: usage.storageMb,
          openGaps: usage.openGaps,
        },
        limits,
        invoices,
      })
    );
  });

  app.post("/billing/checkout", async (req, reply) => {
    try {
      await requireAdmin(req);
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

    if (!stripeEnabled()) {
      return reply.status(503).send(err("Stripe is not configured"));
    }

    if (org.planSource === "MANUAL" && org.plan === "ENTERPRISE") {
      return reply
        .status(400)
        .send(err("This workspace is on a negotiated Enterprise plan. Contact sales to change it."));
    }

    const body = (req.body as { plan?: string; interval?: BillingInterval }) ?? {};
    const planRaw = (body.plan ?? "STARTER").toUpperCase();
    if (!isStripeBillablePlan(planRaw)) {
      return reply.status(400).send(err(`Plan ${planRaw} is not available for self-serve checkout`));
    }
    const interval: BillingInterval = body.interval === "annual" ? "annual" : "monthly";
    const priceId = priceIdForPlan(planRaw, interval);
    if (!priceId) {
      return reply
        .status(400)
        .send(
          err(
            `No Stripe price configured for ${planRaw} (${interval}). Set STRIPE_PRICE_${planRaw}${interval === "annual" ? "_ANNUAL" : ""}.`
          )
        );
    }

    const stripe = await getStripe();
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId: org.id, slug: org.slug },
      });
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const returnBase = billingReturnBase(req);

    // Existing subscribers should change plans in the Customer Portal (avoids duplicate subs).
    if (org.stripeSubscriptionId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${returnBase}/billing`,
      });
      return reply.send(
        ok({
          url: portal.url,
          sessionId: null,
          via: "portal" as const,
          message: "Opened billing portal to change your existing subscription.",
        })
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBase}/billing?checkout=success&plan=${encodeURIComponent(planRaw)}`,
      cancel_url: `${returnBase}/billing?checkout=cancelled`,
      metadata: { orgId: org.id, plan: planRaw, interval },
      subscription_data: { metadata: { orgId: org.id, plan: planRaw, interval } },
      allow_promotion_codes: true,
    });

    return reply.send(
      ok({ url: session.url, sessionId: session.id, via: "checkout" as const })
    );
  });

  app.post("/billing/portal", async (req, reply) => {
    try {
      await requireAdmin(req);
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

    if (!stripeEnabled()) {
      return reply.status(503).send(err("Stripe is not configured"));
    }

    const stripe = await getStripe();
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId: org.id, slug: org.slug },
      });
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const body = (req.body as { flow?: string }) ?? {};
    const returnUrl = `${billingReturnBase(req)}/billing`;

    if (body.flow === "payment_method_update") {
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
          flow_data: { type: "payment_method_update" },
        });
        return reply.send(ok({ url: session.url, flow: "payment_method_update" as const }));
      } catch {
        // Portal configuration may not enable this flow — fall through to default portal.
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return reply.send(ok({ url: session.url, flow: "portal" as const }));
  });
};
