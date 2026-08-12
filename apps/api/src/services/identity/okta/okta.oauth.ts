import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const DEMO_ORG_SLUG = "demo";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function redirectUri(): string {
  return (
    process.env.OKTA_REDIRECT_URI ??
    `${APP_URL}/api/auth/okta/callback`
  );
}

export function getOktaOAuthUrl(domain: string, orgSlug: string = DEMO_ORG_SLUG): string {
  const clientId = process.env.OKTA_CLIENT_ID;
  if (!clientId) throw new Error("OKTA_CLIENT_ID not configured");

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const state = Buffer.from(JSON.stringify({ org: orgSlug, domain: cleanDomain })).toString(
    "base64url"
  );
  const scopes = [
    "openid",
    "profile",
    "email",
    "okta.users.read",
    "okta.groups.read",
    "okta.logs.read",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: scopes,
    redirect_uri: redirectUri(),
    state,
  });

  return `https://${cleanDomain}/oauth2/v1/authorize?${params}`;
}

export async function exchangeOktaCode(
  code: string,
  domain: string
): Promise<{ accessToken: string; refreshToken?: string }> {
  const clientId = process.env.OKTA_CLIENT_ID!;
  const clientSecret = process.env.OKTA_CLIENT_SECRET!;
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const res = await fetch(`https://${cleanDomain}/oauth2/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Okta token exchange failed: ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; refresh_token?: string };
  return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

export async function handleOktaOAuthCallback(
  code: string,
  stateB64: string
): Promise<{ integrationId: string }> {
  const state = JSON.parse(Buffer.from(stateB64, "base64url").toString()) as {
    org?: string;
    domain: string;
  };
  const orgSlug = state.org ?? DEMO_ORG_SLUG;
  const domain = state.domain;

  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  await gateNewProviderConnection(org.id, org.plan, "OKTA");

  const tokens = await exchangeOktaCode(code, domain);

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "OKTA",
        externalId: domain,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      name: `Okta (${domain})`,
      metadata: { domain },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "OKTA",
      category: "IDENTITY",
      name: `Okta (${domain})`,
      externalId: domain,
      accessToken: encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : undefined,
      scopes: ["okta.users.read", "okta.groups.read", "okta.logs.read"],
      metadata: { domain },
    },
  });

  return { integrationId: integration.id };
}
