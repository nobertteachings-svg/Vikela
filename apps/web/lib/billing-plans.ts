/**
 * Marketing + billing plan copy aligned to PLAN_LIMITS in
 * apps/api/src/lib/plan-limits.ts.
 *
 * FREE: seats 3, integrations 1, scans 5
 * STARTER: seats 10, integrations 5, scans 50
 * GROWTH: seats 25, integrations 20, scans 500
 * ENTERPRISE: seats 100, integrations 999, scans high
 */

export type BillingPlanId = "free" | "starter" | "growth" | "enterprise";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  price: number | null;
  period: string;
  description: string;
  features: string[];
  highlight?: boolean;
  cta: string;
};

/** Limits mirrored from API PLAN_LIMITS (for UI copy). */
export const PLAN_LIMITS_COPY = {
  free: { seats: 3, integrations: 1, scansPerMonth: 5 },
  starter: { seats: 10, integrations: 5, scansPerMonth: 50 },
  growth: { seats: 25, integrations: 20, scansPerMonth: 500 },
  enterprise: { seats: 100, integrations: 999, scansPerMonth: 99999 },
} as const;

export const billingPlans: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Assess posture with one integration before you commit.",
    features: [
      "1 integration connected",
      "Up to 3 team seats",
      "5 scans per month",
      "Posture score & gap report",
      "Framework mapping packs",
    ],
    cta: "Downgrade",
  },
  {
    id: "starter",
    name: "Starter",
    price: 299,
    period: "/month",
    description: "Continuous scanning for teams shipping their first SOC 2.",
    features: [
      "Up to 5 integrations",
      "Up to 10 team seats",
      "50 scans per month",
      "Continuous code & cloud scanning",
      "Framework dashboards",
      "Email gap alerts",
    ],
    cta: "Switch to Starter",
  },
  {
    id: "growth",
    name: "Growth",
    price: 799,
    period: "/month",
    description: "AI-assisted remediation and evidence for audit-ready programs.",
    features: [
      "Everything in Starter",
      "Up to 20 integrations",
      "Up to 25 team seats",
      "500 scans per month",
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
    period: "custom",
    description:
      "Custom controls, priority support, and SSO available via Clerk Enterprise.",
    features: [
      "Up to 100 seats & high scan volume",
      "Up to 999 integrations",
      "Framework mapping packs & control tracking",
      "Custom control mappings",
      "Auditor portal",
      "SSO available via Clerk Enterprise",
      "Dedicated CSM & SLA",
    ],
    cta: "Contact sales",
  },
];

/** Landing-page pricing cards (subset of billingPlans, marketing CTAs). */
export const landingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 integration connected",
      "Up to 3 team seats",
      "5 scans per month",
      "Posture score & gap report",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$299",
    period: "/month",
    features: [
      "Up to 5 integrations",
      "Up to 10 team seats",
      "50 scans per month",
      "Framework dashboards",
    ],
    cta: "Start trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$799",
    period: "/month",
    features: [
      "Up to 20 integrations",
      "Up to 25 team seats",
      "500 scans per month",
      "AI copilot & policy generator",
      "Evidence vault & exports",
      "Security questionnaires",
    ],
    cta: "Start trial",
    highlight: true,
  },
] as const;

export const enterpriseFooterCopy =
  "Enterprise — custom controls, priority support, SSO available via Clerk Enterprise.";
