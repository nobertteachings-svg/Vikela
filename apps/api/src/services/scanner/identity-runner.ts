import type { ScanFinding } from "@vikela/shared";
import type { IntegrationProvider } from "@prisma/client";
import { decrypt } from "../../lib/crypto.js";
import { getIdentityProvider } from "../identity/provider.factory.js";
import type { IdentityCredentials } from "../identity/types.js";

export function buildIdentityCredentials(
  provider: IntegrationProvider,
  accessTokenEncrypted: string,
  metadata: Record<string, unknown> | null
): IdentityCredentials {
  const token = decrypt(accessTokenEncrypted);
  const meta = metadata ?? {};
  return {
    accessToken: token,
    domain: meta.domain as string | undefined,
    tenantId: meta.tenantId as string | undefined,
    customerId: meta.customerId as string | undefined,
    auth0Domain: meta.auth0Domain as string | undefined,
    apiKey: provider === "JUMPCLOUD" ? token : undefined,
  };
}

export async function runIdentityScan(
  provider: IntegrationProvider,
  accessTokenEncrypted: string,
  metadata: Record<string, unknown> | null
): Promise<ScanFinding[]> {
  const credentials = buildIdentityCredentials(provider, accessTokenEncrypted, metadata);
  const identity = getIdentityProvider(provider, credentials);
  return identity.runComplianceChecks();
}
