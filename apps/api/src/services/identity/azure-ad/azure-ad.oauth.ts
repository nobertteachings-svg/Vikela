import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const DEMO_ORG_SLUG = "demo";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function tenantId(): string {
  return process.env.AZURE_AD_TENANT_ID ?? process.env.AZURE_TENANT_ID ?? "common";
}

function redirectUri(): string {
  return (
    process.env.AZURE_AD_REDIRECT_URI ??
    `${APP_URL}/api/auth/azure-ad/callback`
  );
}

const GRAPH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read.All",
  "Group.Read.All",
  "Policy.Read.All",
  "AuditLog.Read.All",
  "Directory.Read.All",
].join(" ");

export function getAzureAdOAuthUrl(orgSlug: string = DEMO_ORG_SLUG): string {
  const clientId = process.env.AZURE_CLIENT_ID ?? process.env.AZURE_AD_CLIENT_ID;
  if (!clientId) throw new Error("AZURE_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: GRAPH_SCOPES,
    state: orgSlug,
  });

  return `https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeAzureAdCode(
  code: string
): Promise<{ accessToken: string; refreshToken?: string; tenantId: string }> {
  const clientId = process.env.AZURE_CLIENT_ID ?? process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET ?? process.env.AZURE_AD_CLIENT_SECRET!;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Azure AD token exchange failed: ${await res.text()}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    tenant_id?: string;
  };

  let resolvedTenant = json.tenant_id ?? tenantId();
  if (resolvedTenant === "common") {
    const parts = json.access_token.split(".");
    if (parts[1]) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as {
          tid?: string;
        };
        if (payload.tid) resolvedTenant = payload.tid;
      } catch {
        /* ignore */
      }
    }
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    tenantId: resolvedTenant,
  };
}

export async function handleAzureAdOAuthCallback(
  code: string,
  orgSlug: string = DEMO_ORG_SLUG
): Promise<{ integrationId: string }> {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  await gateNewProviderConnection(org.id, org.plan, "AZURE_AD");

  const tokens = await exchangeAzureAdCode(code);

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AZURE_AD",
        externalId: tokens.tenantId,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      name: `Azure AD (${tokens.tenantId})`,
      metadata: { tenantId: tokens.tenantId },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "AZURE_AD",
      category: "IDENTITY",
      name: `Azure AD (${tokens.tenantId})`,
      externalId: tokens.tenantId,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      scopes: GRAPH_SCOPES.split(" "),
      metadata: { tenantId: tokens.tenantId },
    },
  });

  return { integrationId: integration.id };
}
