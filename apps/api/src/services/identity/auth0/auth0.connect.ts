import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function managementClientId(): string | undefined {
  return (
    process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim() ||
    process.env.AUTH0_CLIENT_ID?.trim() ||
    undefined
  );
}

function managementClientSecret(): string | undefined {
  return (
    process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim() ||
    process.env.AUTH0_CLIENT_SECRET?.trim() ||
    undefined
  );
}

export function isAuth0Configured(): boolean {
  return Boolean(managementClientId() && managementClientSecret());
}

/** Exchange M2M credentials for an Auth0 Management API access token. */
export async function fetchAuth0ManagementToken(domain: string): Promise<string> {
  const clientId = managementClientId();
  const clientSecret = managementClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Auth0 is not configured — set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET (Machine-to-Machine app with read:users)"
    );
  }

  const d = cleanDomain(domain);
  const tokenRes = await fetch(`https://${d}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${d}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Auth0 token exchange failed: ${tokenRes.status} — ${body.slice(0, 280)}`);
  }

  const json = (await tokenRes.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Auth0 token response missing access_token");
  }
  return json.access_token;
}

export async function connectAuth0Account(params: {
  domain: string;
  orgSlug: string;
  name?: string;
}): Promise<{ integrationId: string; domain: string }> {
  const domain = cleanDomain(params.domain);
  if (!domain || !domain.includes(".")) {
    throw new Error("Enter a valid Auth0 domain (e.g. your-tenant.us.auth0.com)");
  }

  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  await gateNewProviderConnection(org.id, org.plan, "AUTH0");

  const accessToken = await fetchAuth0ManagementToken(domain);

  // Verify Management API access before persisting.
  const probe = await fetch(`https://${domain}/api/v2/users?per_page=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!probe.ok) {
    const body = await probe.text();
    throw new Error(
      `Auth0 Management API denied users read (${probe.status}). Grant the M2M app read:users on the Auth0 Management API. ${body.slice(0, 200)}`
    );
  }

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AUTH0",
        externalId: domain,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(accessToken),
      name: params.name ?? `Auth0 (${domain})`,
      metadata: { auth0Domain: domain, purpose: "identity" },
      lastSyncedAt: new Date(),
      scopes: ["read:users"],
    },
    create: {
      orgId: org.id,
      provider: "AUTH0",
      category: "IDENTITY",
      name: params.name ?? `Auth0 (${domain})`,
      externalId: domain,
      accessToken: encrypt(accessToken),
      scopes: ["read:users"],
      metadata: { auth0Domain: domain, purpose: "identity" },
    },
  });

  return { integrationId: integration.id, domain };
}
