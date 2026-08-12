import type { ScanFinding } from "@vikela/shared";
import type { CloudProvider } from "@prisma/client";
import { decrypt } from "../../lib/crypto.js";
import { getCloudProvider } from "../cloud/provider.factory.js";
import type { CloudCredentials } from "../cloud/types.js";

export function buildCloudCredentials(
  provider: CloudProvider,
  accessTokenEncrypted: string,
  metadata: Record<string, unknown> | null
): CloudCredentials {
  const meta = metadata ?? {};
  return {
    accessToken: decrypt(accessTokenEncrypted),
    roleArn: meta.roleArn as string | undefined,
    externalId: meta.externalId as string | undefined,
    subscriptionId: meta.subscriptionId as string | undefined,
    projectId: meta.projectId as string | undefined,
    accountId: (meta.accountId as string | undefined) ?? undefined,
  };
}

export async function runCloudScan(
  provider: CloudProvider,
  accessTokenEncrypted: string,
  metadata: Record<string, unknown> | null
): Promise<ScanFinding[]> {
  const credentials = buildCloudCredentials(provider, accessTokenEncrypted, metadata);
  const cloud = getCloudProvider(provider, credentials);
  return cloud.runComplianceChecks();
}
