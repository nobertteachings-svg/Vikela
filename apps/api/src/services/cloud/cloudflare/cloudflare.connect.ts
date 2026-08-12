import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const CF_API = "https://api.cloudflare.com/client/v4";

type CfEnvelope<T> = {
  success: boolean;
  errors?: { message?: string }[];
  result?: T;
};

async function cfGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const json = (await res.json()) as CfEnvelope<T>;
  if (!res.ok || !json.success) {
    const msg = json.errors?.[0]?.message ?? `Cloudflare API ${res.status}`;
    throw new Error(msg);
  }
  if (json.result === undefined) {
    throw new Error("Cloudflare API returned empty result");
  }
  return json.result;
}

export async function connectCloudflareAccount(params: {
  apiToken: string;
  accountId?: string;
  accountName?: string;
  orgSlug: string;
}) {
  const token = params.apiToken.trim();
  if (!token) throw new Error("API token required");

  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  const verify = await cfGet<{ status?: string }>(token, "/user/tokens/verify");
  if (verify.status && verify.status !== "active") {
    throw new Error(`Cloudflare API token is ${verify.status}`);
  }

  const accounts = await cfGet<{ id: string; name: string }[]>(token, "/accounts?per_page=50");
  if (!accounts.length) {
    throw new Error(
      "No Cloudflare accounts visible to this token. Create a token with Account → Account Settings → Read (or use an account-owned token)."
    );
  }

  let account = accounts[0]!;
  if (params.accountId?.trim()) {
    const match = accounts.find((a) => a.id === params.accountId!.trim());
    if (!match) {
      throw new Error(
        `Account ID ${params.accountId.trim()} not found for this token. Visible: ${accounts
          .map((a) => a.id)
          .join(", ")}`
      );
    }
    account = match;
  }

  await gateNewProviderConnection(org.id, org.plan, "CLOUDFLARE");

  const metadata = { accountId: account.id, accountName: account.name };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "CLOUDFLARE",
        externalId: account.id,
      },
    },
    update: {
      isActive: true,
      name: params.accountName ?? `Cloudflare (${account.name})`,
      accessToken: encrypt(token),
      metadata,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "CLOUDFLARE",
      category: "CLOUD",
      name: params.accountName ?? `Cloudflare (${account.name})`,
      externalId: account.id,
      accessToken: encrypt(token),
      scopes: [],
      metadata,
    },
  });

  const cloudAccount = await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "CLOUDFLARE",
        accountId: account.id,
      },
    },
    update: {
      integrationId: integration.id,
      accountName: params.accountName ?? account.name,
      region: "global",
      isActive: true,
    },
    create: {
      orgId: org.id,
      integrationId: integration.id,
      provider: "CLOUDFLARE",
      accountId: account.id,
      accountName: params.accountName ?? account.name,
      region: "global",
      environment: "PRODUCTION",
    },
  });

  return { integration, cloudAccount, accountId: account.id, accountName: account.name };
}
