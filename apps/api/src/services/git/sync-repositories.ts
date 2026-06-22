import { prisma } from "../../lib/prisma.js";
import { decrypt } from "../../lib/crypto.js";
import { getGitProvider, toGitProviderName } from "./provider.factory.js";
import { resolveGithubAccessToken } from "./github/github-token.js";

export async function syncGitRepositories(integrationId: string): Promise<number> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: { org: true },
  });

  if (!integration) throw new Error("Integration not found");

  const gitName = toGitProviderName(integration.provider);
  if (!gitName) throw new Error("Not a git provider");

  const token =
    gitName === "github"
      ? await resolveGithubAccessToken(integration)
      : decrypt(integration.accessToken);

  const git = getGitProvider(gitName, token);
  const repos = await git.listRepositories();

  const seenExternalIds = new Set<string>();

  for (const repo of repos) {
    seenExternalIds.add(repo.externalId);
    await prisma.repository.upsert({
      where: {
        integrationId_externalId: {
          integrationId: integration.id,
          externalId: repo.externalId,
        },
      },
      update: {
        name: repo.name,
        fullName: repo.fullName,
        cloneUrl: repo.cloneUrl,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
        isActive: true,
      },
      create: {
        orgId: integration.orgId,
        integrationId: integration.id,
        externalId: repo.externalId,
        name: repo.name,
        fullName: repo.fullName,
        cloneUrl: repo.cloneUrl,
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.isPrivate,
      },
    });
  }

  if (seenExternalIds.size > 0) {
    await prisma.repository.updateMany({
      where: {
        integrationId: integration.id,
        externalId: { notIn: [...seenExternalIds] },
      },
      data: { isActive: false },
    });
  }

  await prisma.integration.update({
    where: { id: integrationId },
    data: { lastSyncedAt: new Date() },
  });

  return repos.length;
}
