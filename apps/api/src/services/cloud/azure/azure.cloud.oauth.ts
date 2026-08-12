import { prisma } from "../../../lib/prisma.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";
import { connectAzureCloudAccount } from "./azure.connect.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const AZURE_CLOUD_SCOPES = "openid offline_access https://management.azure.com/user_impersonation";

/**
 * Cloud connect should not force the Entra tenant used for app registration.
 * Prefer AZURE_CLOUD_TENANT_ID, else "common" so the user can pick the directory
 * that actually owns Azure subscriptions.
 */
function tenantId(): string {
  return (
    process.env.AZURE_CLOUD_TENANT_ID?.trim() ||
    process.env.AZURE_TENANT_ID?.trim() ||
    "common"
  );
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
    prompt: "select_account",
  });

  // Use "common" for authorize so users can switch directories; token exchange
  // still uses tenantId() (override via AZURE_CLOUD_TENANT_ID=common recommended).
  const authTenant = process.env.AZURE_CLOUD_TENANT_ID?.trim() || "common";
  return `https://login.microsoftonline.com/${authTenant}/oauth2/v2.0/authorize?${params}`;
}

export async function handleAzureCloudOAuthCallback(code: string, state: string) {
  const { orgSlug } = JSON.parse(Buffer.from(state, "base64url").toString()) as {
    orgSlug: string;
  };

  const clientId = process.env.AZURE_CLIENT_ID!;
  // Prefer AZURE_CLIENT_SECRET; accept *_VALUE alias (Azure Portal labels).
  const clientSecret =
    process.env.AZURE_CLIENT_SECRET ?? process.env.AZURE_CLIENT_SECRET_VALUE;
  if (!clientSecret) {
    throw new Error(
      "AZURE_CLIENT_SECRET is not set — paste the client secret Value from Azure (not the Secret ID)"
    );
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret)) {
    throw new Error(
      "AZURE_CLIENT_SECRET looks like a Secret ID — use the secret Value from Certificates & secrets"
    );
  }

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

  if (!subsRes.ok) {
    throw new Error(`Azure subscription listing failed: ${subsRes.status}`);
  }

  const subs = (await subsRes.json()) as {
    value?: { subscriptionId: string; displayName: string }[];
  };
  const first = subs.value?.[0];
  if (!first) {
    throw new Error(
      "No Azure subscriptions found for this Microsoft account/directory. " +
        "In Azure Portal: pick the directory that has a subscription → Subscriptions → " +
        "ensure your user has at least Reader → reconnect and choose that account. " +
        "Also grant admin consent for API permission: Azure Service Management → user_impersonation."
    );
  }

  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);
  await gateNewProviderConnection(org.id, org.plan, "AZURE");

  const result = await connectAzureCloudAccount({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    subscriptionId: first.subscriptionId,
    subscriptionName: first.displayName,
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
