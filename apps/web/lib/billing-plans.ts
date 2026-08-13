/**
 * Marketing + billing plan copy aligned to PLAN_LIMITS in
 * apps/api/src/lib/plan-limits.ts.
 *
 * FREE: seats 3, integrations 1, scans 5
 * SOLO: seats 3, integrations 2, scans 15
 * STARTER: seats 10, integrations 5, scans 50
 * GROWTH: seats 25, integrations 20, scans 500
 * ENTERPRISE: seats 100, integrations 999, scans high
 */

export type BillingPlanId = "free" | "solo" | "starter" | "growth" | "enterprise";

export type BillingInterval = "monthly" | "annual";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  /** Monthly list price in USD; null = custom. */
  price: number | null;
  /** Annual equivalent monthly price (≈17% off); null when not sold annually. */
  priceAnnualMonthly: number | null;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  cta: string;
};

/** Limits mirrored from API PLAN_LIMITS (for UI copy). */
export const PLAN_LIMITS_COPY = {
  free: { seats: 3, integrations: 1, scansPerMonth: 5 },
  solo: { seats: 3, integrations: 2, scansPerMonth: 15 },
  starter: { seats: 10, integrations: 5, scansPerMonth: 50 },
  growth: { seats: 25, integrations: 20, scansPerMonth: 500 },
  enterprise: { seats: 100, integrations: 999, scansPerMonth: 99999 },
} as const;

export const billingPlans: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceAnnualMonthly: null,
    period: "forever",
    description: "Assess posture with one integration before you commit.",
    features: [
      "1 integration connected",
      "Up to 3 team seats",
      "5 compliance checks per month",
      "Posture score & gap report",
      "Framework mapping packs",
    ],
    cta: "Downgrade",
  },
  {
    id: "solo",
    name: "Solo",
    price: 59,
    priceAnnualMonthly: 49,
    period: "/month",
    description: "For founders validating posture with a second integration.",
    features: [
      "Up to 2 integrations",
      "Up to 3 team seats",
      "15 compliance checks per month",
      "Posture score & gap report",
      "Framework mapping packs",
    ],
    cta: "Upgrade to Solo",
  },
  {
    id: "starter",
    name: "Starter",
    price: 329,
    priceAnnualMonthly: 274,
    period: "/month",
    description: "Continuous checks for teams shipping their first SOC 2.",
    features: [
      "Up to 5 integrations",
      "Up to 10 team seats",
      "50 compliance checks per month",
      "Continuous code & cloud checks",
      "Framework dashboards",
      "Email gap alerts",
    ],
    cta: "Switch to Starter",
  },
  {
    id: "growth",
    name: "Growth",
    price: 949,
    priceAnnualMonthly: 789,
    period: "/month",
    description: "AI-assisted remediation and evidence for audit-ready programs.",
    features: [
      "Everything in Starter",
      "Up to 20 integrations",
      "Up to 25 team seats",
      "500 compliance checks per month",
      "Vikela Copilot & policy generator",
      "Evidence vault & auditor exports",
      "Security questionnaires",
      "Priority support",
    ],
    highlight: true,
    cta: "Current plan",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    priceAnnualMonthly: null,
    period: "custom",
    description: "Custom controls, priority support, and SSO for larger programs.",
    features: [
      "Up to 100 seats & high check volume",
      "Up to 999 integrations",
      "Framework mapping packs & control tracking",
      "Custom control mappings",
      "Auditor portal",
      "SSO available on Enterprise",
      "Dedicated CSM & SLA",
    ],
    cta: "Contact sales",
  },
];

/** Display price for a plan given billing interval. */
export function displayPlanPrice(
  plan: BillingPlan,
  interval: BillingInterval
): { amount: number | null; suffix: string } {
  if (plan.price == null) return { amount: null, suffix: "custom" };
  if (plan.price === 0) return { amount: 0, suffix: "forever" };
  if (interval === "annual" && plan.priceAnnualMonthly != null) {
    return { amount: plan.priceAnnualMonthly, suffix: "/mo billed annually" };
  }
  return { amount: plan.price, suffix: "/month" };
}

/** Landing-page pricing cards (subset of billingPlans, marketing CTAs). */
export const landingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 integration connected",
      "Up to 3 team seats",
      "5 compliance checks per month",
      "Posture score & gap report",
    ],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Solo",
    price: "$59",
    period: "/month",
    features: [
      "Up to 2 integrations",
      "Up to 3 team seats",
      "15 compliance checks per month",
      "Framework mapping packs",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$329",
    period: "/month",
    features: [
      "Up to 5 integrations",
      "Up to 10 team seats",
      "50 compliance checks per month",
      "Framework dashboards",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$949",
    period: "/month",
    features: [
      "Up to 20 integrations",
      "Up to 25 team seats",
      "500 compliance checks per month",
      "AI copilot & policy generator",
      "Evidence vault & exports",
      "Security questionnaires",
    ],
    cta: "Start free",
    highlight: true,
  },
] as const;

export const enterpriseFooterCopy =
  "Enterprise — custom controls, priority support, SSO on Enterprise plans. Annual billing saves ~17%.";
