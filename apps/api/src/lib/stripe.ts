import type { Plan } from "@prisma/client";

export type BillingInterval = "monthly" | "annual";

/** Paid self-serve plans that map to Stripe prices. */
export type StripeBillablePlan = Exclude<Plan, "FREE" | "ENTERPRISE">;

const MONTHLY_ENV: Record<StripeBillablePlan, string> = {
  SOLO: "STRIPE_PRICE_SOLO",
  STARTER: "STRIPE_PRICE_STARTER",
  GROWTH: "STRIPE_PRICE_GROWTH",
};

const ANNUAL_ENV: Record<StripeBillablePlan, string> = {
  SOLO: "STRIPE_PRICE_SOLO_ANNUAL",
  STARTER: "STRIPE_PRICE_STARTER_ANNUAL",
  GROWTH: "STRIPE_PRICE_GROWTH_ANNUAL",
};

/** Legacy aliases still accepted for monthly Starter/Growth. */
const LEGACY_MONTHLY_ENV: Partial<Record<StripeBillablePlan, string>> = {
  STARTER: "STRIPE_PRICE_STARTER",
  GROWTH: "STRIPE_PRICE_GROWTH",
};

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function getStripe() {
  if (!stripeEnabled()) {
    throw new Error("Stripe is not configured");
  }
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });
}

export function isStripeBillablePlan(plan: string): plan is StripeBillablePlan {
  return plan === "SOLO" || plan === "STARTER" || plan === "GROWTH";
}

export function priceIdForPlan(
  plan: Plan,
  interval: BillingInterval = "monthly"
): string | null {
  if (!isStripeBillablePlan(plan)) return null;
  const envKey = interval === "annual" ? ANNUAL_ENV[plan] : MONTHLY_ENV[plan];
  const fromEnv = process.env[envKey];
  if (fromEnv) return fromEnv;
  if (interval === "monthly") {
    const legacy = LEGACY_MONTHLY_ENV[plan];
    if (legacy) return process.env[legacy] ?? null;
  }
  return null;
}

/** Build reverse map of configured Stripe price IDs → plan (+ interval). */
export function buildStripePriceCatalog(): Map<
  string,
  { plan: StripeBillablePlan; interval: BillingInterval }
> {
  const map = new Map<string, { plan: StripeBillablePlan; interval: BillingInterval }>();
  for (const plan of ["SOLO", "STARTER", "GROWTH"] as StripeBillablePlan[]) {
    const monthly = priceIdForPlan(plan, "monthly");
    if (monthly) map.set(monthly, { plan, interval: "monthly" });
    const annual = priceIdForPlan(plan, "annual");
    if (annual) map.set(annual, { plan, interval: "annual" });
  }
  return map;
}

export function planFromStripePrice(priceId: string): Plan | null {
  if (!priceId) return null;
  return buildStripePriceCatalog().get(priceId)?.plan ?? null;
}

export function intervalFromStripePrice(priceId: string): BillingInterval | null {
  if (!priceId) return null;
  return buildStripePriceCatalog().get(priceId)?.interval ?? null;
}

export function mapStripeSubscriptionStatus(
  status: string | null | undefined
): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      // incomplete, paused, etc., treat as past_due until paid
      return "PAST_DUE";
  }
}
