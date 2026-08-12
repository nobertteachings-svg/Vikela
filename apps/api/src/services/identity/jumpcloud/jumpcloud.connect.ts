import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const JC_BASE = "https://console.jumpcloud.com/api";

/** Verify API key can read directory, then upsert JumpCloud integration. */
export async function connectJumpCloudAccount(params: {
  apiKey: string;
  name?: string;
  orgSlug: string;
}) {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error("API key required");

  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  const res = await fetch(`${JC_BASE}/systemusers?limit=1`, {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "JumpCloud rejected this API key. In Admin Portal → API Settings, create a key with read access to System Users."
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`JumpCloud API error (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`);
  }

  await gateNewProviderConnection(org.id, org.plan, "JUMPCLOUD");

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "JUMPCLOUD",
        externalId: "jumpcloud",
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(apiKey),
      name: params.name ?? "JumpCloud",
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "JUMPCLOUD",
      category: "IDENTITY",
      name: params.name ?? "JumpCloud",
      externalId: "jumpcloud",
      accessToken: encrypt(apiKey),
      scopes: [],
    },
  });

  return { integration };
}
