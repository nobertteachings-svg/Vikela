import type { BillingStatus, Plan, PlanSource } from "@prisma/client";

export type PlanFeature =
  | "framework_dashboards"
  | "copilot"
  | "policy_generator"
  | "evidence_exports"
  | "questionnaires"
  | "priority_support";

const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  framework_dashboards: "STARTER",
  copilot: "GROWTH",
  policy_generator: "GROWTH",
  evidence_exports: "GROWTH",
  questionnaires: "GROWTH",
  priority_support: "GROWTH",
};

const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  SOLO: 1,
  STARTER: 2,
  GROWTH: 3,
  ENTERPRISE: 4,
};

export function planAtLeast(plan: Plan, minimum: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[minimum];
}

export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return planAtLeast(plan, FEATURE_MIN_PLAN[feature]);
}

/** Paid entitlements require an active/trialing (or manual/comped) billing status. */
export function billingAllowsPaidAccess(org: {
  plan: Plan;
  billingStatus: BillingStatus;
  planSource: PlanSource;
}): boolean {
  if (org.plan === "FREE") return true;
  if (org.planSource === "MANUAL" || org.billingStatus === "COMPED") return true;
  return org.billingStatus === "ACTIVE" || org.billingStatus === "TRIALING";
}

export function assertPlanFeature(
  org: { plan: Plan; billingStatus: BillingStatus; planSource: PlanSource },
  feature: PlanFeature
): void {
  if (!planHasFeature(org.plan, feature)) {
    const err = new Error(
      `This feature requires the ${FEATURE_MIN_PLAN[feature]} plan or higher. Upgrade to unlock it.`
    );
    (err as { statusCode?: number }).statusCode = 402;
    throw err;
  }
  if (!billingAllowsPaidAccess(org) && org.plan !== "FREE") {
    const err = new Error(
      "Your subscription is past due or canceled. Update billing to continue using paid features."
    );
    (err as { statusCode?: number }).statusCode = 402;
    throw err;
  }
}

/** Block new billable usage when a paid org is past_due/canceled (unless manual/comped). */
export function assertBillingAllowsUsage(org: {
  plan: Plan;
  billingStatus: BillingStatus;
  planSource: PlanSource;
}): void {
  if (org.plan === "FREE") return;
  if (org.planSource === "MANUAL" || org.billingStatus === "COMPED") return;
  if (org.billingStatus === "ACTIVE" || org.billingStatus === "TRIALING") return;
  const err = new Error(
    "Your subscription is past due or canceled. Update payment method to continue."
  );
  (err as { statusCode?: number }).statusCode = 402;
  throw err;
}
