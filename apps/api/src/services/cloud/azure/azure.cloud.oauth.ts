import { prisma } from "../../../lib/prisma.js";
import { connectAzureCloudAccount } from "./azure.connect.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const AZURE_CLOUD_SCOPES = "openid offline_access https://management.azure.com/user_impersonation";

function tenantId(): string {
  return process.env.AZURE_TENANT_ID ?? "common";
}

function redirectUri(): string {
  return process.env.AZURE_CLOUD_REDIRECT_URI ?? `${APP_URL}/api/auth/azure-cloud/callback`;
}

export function getAzureCloudOAuthUrl(state: string): string {
  const clientId = process.env.AZURE_CLIENT_ID;
  if (!clientId) throw new Error("AZURE_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: AZURE_CLOUD_SCOPES,
    state,
  });

  return `https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/authorize?${params}`;
}

export async function handleAzureCloudOAuthCallback(code: string, state: string) {
  const { orgSlug } = JSON.parse(Buffer.from(state, "base64url").toString()) as {
    orgSlug: string;
  };

  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const tokenRes = await fetch(
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
        scope: AZURE_CLOUD_SCOPES,
      }),
    }
  );

  if (!tokenRes.ok) {
    throw new Error(`Azure token exchange failed: ${await tokenRes.text()}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
  };

  const subsRes = await fetch("https://management.azure.com/subscriptions?api-version=2022-12-01", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  let subscriptionId = "demo-subscription";
  let subscriptionName = "Azure Subscription";

  if (subsRes.ok) {
    const subs = (await subsRes.json()) as {
      value?: { subscriptionId: string; displayName: string }[];
    };
    const first = subs.value?.[0];
    if (first) {
      subscriptionId = first.subscriptionId;
      subscriptionName = first.displayName;
    }
  }

  const result = await connectAzureCloudAccount({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    subscriptionId,
    subscriptionName,
    orgSlug,
  });

  return result;
}

export async function connectAzureCloudDemo(orgSlug: string = "demo") {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error("Organization not found");

  return connectAzureCloudAccount({
    accessToken: "demo-token",
    subscriptionId: "demo-subscription",
    subscriptionName: "Azure (Demo)",
    orgSlug,
  });
}
