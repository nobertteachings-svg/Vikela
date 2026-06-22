import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { resolveOAuthOrganization } from "../../../lib/oauth-org-resolve.js";
import {
  exchangeGitHubOAuthCode,
  getInstallationAccessToken,
  getInstallationAccountLogin,
  isGitHubAppConfigured,
} from "../../../lib/github-app.js";
import { syncGitRepositories } from "../sync-repositories.js";

const DEMO_ORG_SLUG = "demo";

async function deactivateOtherGithubIntegrations(orgId: string, keepId: string): Promise<void> {
  await prisma.integration.updateMany({
    where: {
      orgId,
      provider: "GITHUB",
      id: { not: keepId },
    },
    data: { isActive: false },
  });
}

async function resolveOrg(orgSlug: string | null | undefined, clerkOrgId?: string | null) {
  const org =
    (await resolveOAuthOrganization(orgSlug, clerkOrgId)) ??
    (orgSlug ? await prisma.organization.findFirst({ where: { slug: orgSlug } }) : null);
  if (!org) {
    throw new Error(
      `Organization not found${orgSlug ? `: ${orgSlug}` : ""} — create a workspace in Vikela first`
    );
  }
  return org;
}

export async function handleGitHubInstallationCallback(
  installationId: string,
  orgSlug: string | null = DEMO_ORG_SLUG,
  clerkOrgId?: string | null
) {
  const org = await resolveOrg(orgSlug, clerkOrgId);

  if (!isGitHubAppConfigured()) {
    throw new Error(
      "GitHub App PEM key is missing on the server — use Connect with GitHub OAuth instead"
    );
  }

  const accessToken = await getInstallationAccessToken(installationId);
  const accountLogin = await getInstallationAccountLogin(installationId);

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GITHUB",
        externalId: installationId,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(accessToken),
      name: `${accountLogin} (GitHub App)`,
      metadata: { installationId: Number(installationId), accountLogin },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GITHUB",
      category: "GIT",
      name: `${accountLogin} (GitHub App)`,
      externalId: installationId,
      accessToken: encrypt(accessToken),
      scopes: ["repo"],
      metadata: { installationId: Number(installationId), accountLogin },
    },
  });

  await deactivateOtherGithubIntegrations(org.id, integration.id);

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}

export async function handleGitHubOAuthCallback(
  code: string,
  orgSlug: string | null = DEMO_ORG_SLUG,
  clerkOrgId?: string | null
) {
  const org = await resolveOrg(orgSlug, clerkOrgId);

  const { accessToken, scope } = await exchangeGitHubOAuthCode(code);

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userRes.ok) {
    throw new Error(`GitHub user lookup failed: ${userRes.status}`);
  }
  const user = (await userRes.json()) as { id: number; login: string };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GITHUB",
        externalId: String(user.id),
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(accessToken),
      name: `${user.login} (GitHub)`,
      scopes: scope.split(",").filter(Boolean),
      metadata: { oauth: true, login: user.login },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GITHUB",
      category: "GIT",
      name: `${user.login} (GitHub)`,
      externalId: String(user.id),
      accessToken: encrypt(accessToken),
      scopes: scope.split(",").filter(Boolean),
      metadata: { oauth: true, login: user.login },
    },
  });

  await deactivateOtherGithubIntegrations(org.id, integration.id);

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}
