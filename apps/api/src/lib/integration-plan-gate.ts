import type { BillingStatus, IntegrationProvider, Plan, PlanSource } from "@prisma/client";
import { assertCanConnectIntegration } from "./plan-limits.js";
import { assertBillingAllowsUsage } from "./plan-features.js";

/** Call before creating a brand-new provider connection (OAuth callbacks). */
export async function gateNewProviderConnection(
  org: {
    id: string;
    plan: Plan;
    billingStatus: BillingStatus;
    planSource: PlanSource;
  },
  provider: IntegrationProvider
): Promise<void> {
  assertBillingAllowsUsage(org);
  await assertCanConnectIntegration(org.id, org.plan, { provider });
}
