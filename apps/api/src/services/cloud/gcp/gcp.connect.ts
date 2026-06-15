import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { DEMO_ORG_SLUG } from "../../../lib/org-context.js";
import type { FastifyRequest } from "fastify";
import { requireOrganization } from "../../../lib/org-context.js";

export async function connectGcpCloudAccount(params: {
  accessToken: string;
  refreshToken?: string;
  projectId: string;
  projectName?: string;
  orgSlug?: string;
  req?: FastifyRequest;
}) {
  const org = params.req
    ? await requireOrganization(params.req)
    : await prisma.organization.findFirstOrThrow({ where: { slug: params.orgSlug ?? DEMO_ORG_SLUG } });

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GCP",
        externalId: params.projectId,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(params.accessToken),
      refreshToken: params.refreshToken ? encrypt(params.refreshToken) : undefined,
      name: params.projectName ?? `GCP (${params.projectId})`,
      metadata: { projectId: params.projectId },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GCP",
      category: "CLOUD",
      name: params.projectName ?? `GCP (${params.projectId})`,
      externalId: params.projectId,
      accessToken: encrypt(params.accessToken),
      refreshToken: params.refreshToken ? encrypt(params.refreshToken) : undefined,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      metadata: { projectId: params.projectId },
    },
  });

  const cloudAccount = await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "GCP",
        accountId: params.projectId,
      },
    },
    update: {
      isActive: true,
      accountName: params.projectName ?? params.projectId,
      integrationId: integration.id,
    },
    create: {
      orgId: org.id,
      integrationId: integration.id,
      provider: "GCP",
      accountId: params.projectId,
      accountName: params.projectName ?? params.projectId,
      region: "global",
    },
  });

  return { integration, cloudAccount };
}
