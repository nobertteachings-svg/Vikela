import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { syncGitRepositories } from "../sync-repositories.js";

const DEMO_ORG_SLUG = "demo";

export function getBitbucketOAuthUrl(state: string): string {
  const clientId = process.env.BITBUCKET_CLIENT_ID;
  const redirectUri =
    process.env.BITBUCKET_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/bitbucket/callback`;
  return `https://bitbucket.org/site/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
}

export async function handleBitbucketOAuthCallback(code: string, orgSlug: string = DEMO_ORG_SLUG) {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  const redirectUri =
    process.env.BITBUCKET_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/bitbucket/callback`;

  const basic = Buffer.from(
    `${process.env.BITBUCKET_CLIENT_ID}:${process.env.BITBUCKET_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://bitbucket.org/site/oauth2/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(tokenData.error ?? "Bitbucket token exchange failed");
  }

  const userRes = await fetch("https://api.bitbucket.org/2.0/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = (await userRes.json()) as { uuid: string; username: string };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "BITBUCKET",
        externalId: user.uuid,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
      name: `${user.username} (Bitbucket)`,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "BITBUCKET",
      category: "GIT",
      name: `${user.username} (Bitbucket)`,
      externalId: user.uuid,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
      scopes: ["repository"],
      metadata: { username: user.username },
    },
  });

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}
