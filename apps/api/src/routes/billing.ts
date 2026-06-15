import type { FastifyPluginAsync } from "fastify";
import type { Plan } from "@prisma/client";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { prisma } from "../lib/prisma.js";
import { getStripe, priceIdForPlan, stripeEnabled } from "../lib/stripe.js";
import { getOrgUsage, getPlanLimits } from "../lib/plan-limits.js";
import { requireAdmin, requireRead } from "../lib/authorization.js";

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
};

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function defaultBillingStatus(plan: Plan, stripeSubscriptionId: string | null): string {
  if (stripeSubscriptionId) return "active";
  return plan === "FREE" ? "free" : "active";
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
    let subscriptionStatus = defaultBillingStatus(org.plan, org.stripeSubscriptionId);
    let renewalDate: string | null = null;
    let renewalAmountCents: number | null = null;
    let billingEmail: string | null = null;

    if (stripeEnabled()) {
      try {
        const stripe = await getStripe();

        if (org.stripeSubscriptionId) {
          const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
          subscriptionStatus = sub.status;
          renewalDate = new Date(sub.current_period_end * 1000).toISOString();
          renewalAmountCents = sub.items.data[0]?.price?.unit_amount ?? null;

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
            const pm = customer.invoice_settings?.default_payment_method;
            if (pm && typeof pm !== "string" && pm.type === "card" && pm.card) {
              paymentMethod = {
                brand: pm.card.brand,
                last4: pm.card.last4 ?? "****",
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
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
        seats: usage.seats,
        billingCycle: "monthly",
        renewalDate,
        nextInvoiceDate: renewalDate ? renewalDate.slice(0, 10) : null,
        renewalAmountCents,
        billingEmail,
        paymentMethod,
        stripeConfigured: stripeEnabled(),
        stripeCustomerId: org.stripeCustomerId,
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

    const body = (req.body as { plan?: Plan }) ?? {};
    const plan = body.plan ?? "STARTER";
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return reply.status(400).send(err(`No Stripe price configured for plan ${plan}`));
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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/billing?checkout=success`,
      cancel_url: `${APP_URL}/billing?checkout=cancelled`,
      metadata: { orgId: org.id, plan },
      subscription_data: { metadata: { orgId: org.id, plan } },
    });

    return reply.send(ok({ url: session.url, sessionId: session.id }));
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

    if (!stripeEnabled() || !org.stripeCustomerId) {
      return reply.status(400).send(err("No billing account on file"));
    }

    const stripe = await getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${APP_URL}/billing`,
    });

    return reply.send(ok({ url: session.url }));
  });
};
