import type { Plan } from "@prisma/client";

const PLAN_PRICE_ENV: Record<Exclude<Plan, "FREE" | "ENTERPRISE">, string> = {
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

export function priceIdForPlan(plan: Plan): string | null {
  if (plan === "FREE" || plan === "ENTERPRISE") return null;
  const envKey = PLAN_PRICE_ENV[plan as keyof typeof PLAN_PRICE_ENV];
  return process.env[envKey] ?? null;
}

export function planFromStripePrice(priceId: string): Plan | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId && priceId === process.env.STRIPE_PRICE_GROWTH) return "GROWTH";
  return null;
}
