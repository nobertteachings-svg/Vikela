import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const DEMO_ORG_SLUG = "demo";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
].join(" ");

function redirectUri(): string {
  return (
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI ??
    `${APP_URL}/api/auth/google-workspace/callback`
  );
}

export function getGoogleWorkspaceOAuthUrl(orgSlug: string = DEMO_ORG_SLUG): string {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_WORKSPACE_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: orgSlug,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleWorkspaceCode(
  code: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; refresh_token?: string };
  return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

export async function handleGoogleWorkspaceOAuthCallback(
  code: string,
  orgSlug: string = DEMO_ORG_SLUG
): Promise<{ integrationId: string }> {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  await gateNewProviderConnection(org, "GOOGLE_WORKSPACE");

  const tokens = await exchangeGoogleWorkspaceCode(code);

  let externalId = "workspace";
  try {
    const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const info = (await me.json()) as { hd?: string; email?: string };
    externalId = info.hd ?? info.email ?? externalId;
  } catch {
    /* use default */
  }

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GOOGLE_WORKSPACE",
        externalId,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      name: `Google Workspace (${externalId})`,
      metadata: { customerId: "my_customer", domain: externalId },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GOOGLE_WORKSPACE",
      category: "IDENTITY",
      name: `Google Workspace (${externalId})`,
      externalId,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      scopes: SCOPES.split(" "),
      metadata: { customerId: "my_customer", domain: externalId },
    },
  });

  return { integrationId: integration.id };
}
