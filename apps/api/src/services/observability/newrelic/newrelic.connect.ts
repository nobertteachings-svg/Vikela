import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

type NrRegion = "US" | "EU";

function graphqlEndpoint(region: NrRegion): string {
  return region === "EU" ? "https://api.eu.newrelic.com/graphql" : "https://api.newrelic.com/graphql";
}

function normalizeRegion(raw?: string): NrRegion {
  const r = (raw ?? "US").trim().toUpperCase();
  if (r === "EU") return "EU";
  if (r === "US") return "US";
  throw new Error('Region must be "US" or "EU"');
}

type NrAccount = { id: number; name?: string | null };

async function nerdGraph(
  apiKey: string,
  region: NrRegion,
  query: string
): Promise<{ data?: Record<string, unknown>; errors?: { message?: string }[] }> {
  const res = await fetch(graphqlEndpoint(region), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "New Relic rejected this User API key. Create a User key (NRAK-…) under API keys and pick the matching region (US/EU)."
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`New Relic API error (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`);
  }

  return (await res.json()) as {
    data?: Record<string, unknown>;
    errors?: { message?: string }[];
  };
}

export async function connectNewRelicAccount(params: {
  userApiKey: string;
  accountId?: string;
  region?: string;
  name?: string;
  orgSlug: string;
}) {
  const userApiKey = params.userApiKey.trim();
  if (!userApiKey) throw new Error("User API key required");

  const region = normalizeRegion(params.region);
  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  const probe = await nerdGraph(
    userApiKey,
    region,
    `{ actor { user { id email name } accounts { id name } } }`
  );

  if (probe.errors?.length) {
    const msg = probe.errors[0]?.message ?? "Unknown GraphQL error";
    if (/invalid|unauthorized|forbidden|api.key/i.test(msg)) {
      throw new Error(
        "New Relic rejected this User API key. Create a User key (NRAK-…) under API keys and pick the matching region (US/EU)."
      );
    }
    throw new Error(`New Relic error: ${msg}`);
  }

  const actor = probe.data?.actor as
    | {
        user?: { id?: string; email?: string; name?: string };
        accounts?: NrAccount[];
      }
    | undefined;

  const accounts = actor?.accounts ?? [];
  if (!accounts.length) {
    throw new Error(
      "This User API key has no accessible New Relic accounts. Confirm the key type is User and the region matches your account."
    );
  }

  let account = accounts[0]!;
  if (params.accountId?.trim()) {
    const wanted = params.accountId.trim();
    const match = accounts.find((a) => String(a.id) === wanted);
    if (!match) {
      throw new Error(
        `Account ID ${wanted} not found for this key. Visible: ${accounts.map((a) => a.id).join(", ")}`
      );
    }
    account = match;
  }

  await gateNewProviderConnection(org, "NEW_RELIC");

  const accountId = String(account.id);
  const metadata = {
    accountId,
    region,
    accountName: account.name ?? undefined,
    userEmail: actor?.user?.email,
  };
  const displayName =
    params.name?.trim() ||
    (account.name ? `New Relic (${account.name})` : `New Relic (${accountId})`);

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "NEW_RELIC",
        externalId: accountId,
      },
    },
    update: {
      isActive: true,
      name: displayName,
      accessToken: encrypt(userApiKey),
      metadata,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "NEW_RELIC",
      category: "OBSERVABILITY",
      name: displayName,
      externalId: accountId,
      accessToken: encrypt(userApiKey),
      scopes: [],
      metadata,
    },
  });

  return { integration, accountId, region };
}
