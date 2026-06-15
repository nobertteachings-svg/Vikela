import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import {
  exchangeGitHubOAuthCode,
  getInstallationAccessToken,
  getInstallationAccountLogin,
  isGitHubAppConfigured,
} from "../../../lib/github-app.js";
import { syncGitRepositories } from "../sync-repositories.js";

const DEMO_ORG_SLUG = "demo";

export async function handleGitHubInstallationCallback(
  installationId: string,
  orgSlug: string = DEMO_ORG_SLUG
) {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  let accessToken = "pending";
  let accountLogin = "github";

  if (isGitHubAppConfigured()) {
    accessToken = await getInstallationAccessToken(installationId);
    accountLogin = await getInstallationAccountLogin(installationId);
  }

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
      name: `${accountLogin} (GitHub)`,
      metadata: { installationId: Number(installationId), accountLogin },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GITHUB",
      category: "GIT",
      name: `${accountLogin} (GitHub)`,
      externalId: installationId,
      accessToken: encrypt(accessToken),
      scopes: ["repo"],
      metadata: { installationId: Number(installationId), accountLogin },
    },
  });

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}

export async function handleGitHubOAuthCallback(code: string, orgSlug: string = DEMO_ORG_SLUG) {
  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  const { accessToken, scope } = await exchangeGitHubOAuthCode(code);

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });
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
      name: `${user.login} (GitHub OAuth)`,
      scopes: scope.split(",").filter(Boolean),
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GITHUB",
      category: "GIT",
      name: `${user.login} (GitHub OAuth)`,
      externalId: String(user.id),
      accessToken: encrypt(accessToken),
      scopes: scope.split(",").filter(Boolean),
      metadata: { oauth: true, login: user.login },
    },
  });

  const repoCount = await syncGitRepositories(integration.id);
  return { integration, repoCount };
}
