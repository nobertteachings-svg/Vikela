import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { syncGitRepositories } from "../sync-repositories.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const GITLAB_HOST = process.env.GITLAB_HOST ?? "https://gitlab.com";
const DEMO_ORG_SLUG = "demo";

export function getGitLabOAuthUrl(state: string): string {
  const clientId = process.env.GITLAB_APP_ID;
  const redirectUri =
    process.env.GITLAB_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/gitlab/callback`;
  const scope = "api read_user read_repository";
  return `${GITLAB_HOST}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

export async function handleGitLabOAuthCallback(code: string, orgSlug: string = DEMO_ORG_SLUG) {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  await gateNewProviderConnection(org, "GITLAB");

  const redirectUri =
    process.env.GITLAB_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/gitlab/callback`;

  const tokenRes = await fetch(`${GITLAB_HOST}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITLAB_APP_ID,
      client_secret: process.env.GITLAB_APP_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(tokenData.error ?? "GitLab token exchange failed");
  }

  const userRes = await fetch(`${GITLAB_HOST}/api/v4/user`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = (await userRes.json()) as { id: number; username: string };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GITLAB",
        externalId: String(user.id),
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
      name: `${user.username} (GitLab)`,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GITLAB",
      category: "GIT",
      name: `${user.username} (GitLab)`,
      externalId: String(user.id),
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
      scopes: ["api", "read_repository"],
      metadata: { host: GITLAB_HOST, username: user.username },
    },
  });

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}
