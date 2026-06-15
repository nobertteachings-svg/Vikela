import { prisma } from "../../lib/prisma.js";
import { decrypt } from "../../lib/crypto.js";
import { getGitProvider, toGitProviderName } from "./provider.factory.js";

export async function syncGitRepositories(integrationId: string): Promise<number> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    include: { org: true },
  });

  if (!integration) throw new Error("Integration not found");

  const gitName = toGitProviderName(integration.provider);
  if (!gitName) throw new Error("Not a git provider");

  const token = decrypt(integration.accessToken);
  const git = getGitProvider(gitName, token);
  const repos = await git.listRepositories();

  for (const repo of repos) {
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

  await prisma.integration.update({
    where: { id: integrationId },
    data: { lastSyncedAt: new Date() },
  });

  return repos.length;
}
