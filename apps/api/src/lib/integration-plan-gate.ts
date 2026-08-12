import type { IntegrationProvider, Plan } from "@prisma/client";
import { assertCanConnectIntegration } from "./plan-limits.js";

/** Call before creating a brand-new provider connection (OAuth callbacks). */
export async function gateNewProviderConnection(
  orgId: string,
  plan: Plan,
  provider: IntegrationProvider
): Promise<void> {
  await assertCanConnectIntegration(orgId, plan, { provider });
}
