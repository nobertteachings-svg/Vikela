import { prisma } from "../../lib/prisma.js";
import { syncGitRepositories } from "../git/sync-repositories.js";

export type OnboardingRepoRow = {
  id: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  provider: string;
  isActive: boolean;
  isPrivate: boolean;
  /** How the parent git integration was authorized. */
  authMethod: "app" | "oauth" | "unknown";
};

function integrationAuthMethod(metadata: unknown): "app" | "oauth" | "unknown" {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "unknown";
  const meta = metadata as { installationId?: number; oauth?: boolean };
  if (meta.installationId != null) return "app";
  if (meta.oauth) return "oauth";
  return "unknown";
}

export async function listOnboardingRepositories(orgId: string): Promise<OnboardingRepoRow[]> {
  const repos = await prisma.repository.findMany({
    where: { orgId },
    include: { integration: true },
    orderBy: { fullName: "asc" },
  });

  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    defaultBranch: r.defaultBranch,
    provider: r.integration.provider,
    isActive: r.isActive,
    isPrivate: r.isPrivate,
    authMethod: integrationAuthMethod(r.integration.metadata),
  }));
}

/** Sync every active git integration and return imported repo count. */
export async function syncOnboardingRepositories(orgId: string): Promise<number> {
  const integrations = await prisma.integration.findMany({
    where: { orgId, isActive: true, category: "GIT" },
  });

  let total = 0;
  for (const integration of integrations) {
    total += await syncGitRepositories(integration.id);
  }
  return total;
}

/**
 * After GitHub App install: require explicit selection when multiple repos;
 * auto-enable the sole repo when only one was granted.
 */
export async function applyOnboardingRepoDefaults(orgId: string): Promise<void> {
  const repos = await prisma.repository.findMany({
    where: { orgId },
    orderBy: { fullName: "asc" },
  });
  if (repos.length === 0) return;

  if (repos.length === 1) {
    await prisma.repository.update({
      where: { id: repos[0]!.id },
      data: { isActive: true },
    });
    return;
  }

  await prisma.repository.updateMany({
    where: { orgId },
    data: { isActive: false },
  });
}

export async function setOnboardingRepositorySelection(
  orgId: string,
  activeRepoIds: string[]
): Promise<{ activeCount: number; scanRepoId: string | null }> {
  const uniqueIds = [...new Set(activeRepoIds)];
  const valid = await prisma.repository.findMany({
    where: { orgId, id: { in: uniqueIds } },
    select: { id: true },
  });
  const validIds = new Set(valid.map((r) => r.id));

  await prisma.repository.updateMany({
    where: { orgId },
    data: { isActive: false },
  });

  if (validIds.size > 0) {
    await prisma.repository.updateMany({
      where: { orgId, id: { in: [...validIds] } },
      data: { isActive: true },
    });
  }

  const scanRepoId = validIds.size > 0 ? [...validIds][0]! : null;
  return { activeCount: validIds.size, scanRepoId };
}
