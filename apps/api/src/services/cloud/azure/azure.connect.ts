import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { requireOrganization, DEMO_ORG_SLUG } from "../../../lib/org-context.js";
import type { FastifyRequest } from "fastify";

export async function connectAzureCloudAccount(params: {
  accessToken: string;
  refreshToken?: string;
  subscriptionId: string;
  subscriptionName?: string;
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
        provider: "AZURE",
        externalId: params.subscriptionId,
      },
    },
    update: {
      isActive: true,
      accessToken: encrypt(params.accessToken),
      refreshToken: params.refreshToken ? encrypt(params.refreshToken) : undefined,
      name: params.subscriptionName ?? `Azure (${params.subscriptionId})`,
      metadata: { subscriptionId: params.subscriptionId, purpose: "cloud" },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "AZURE",
      category: "CLOUD",
      name: params.subscriptionName ?? `Azure (${params.subscriptionId})`,
      externalId: params.subscriptionId,
      accessToken: encrypt(params.accessToken),
      refreshToken: params.refreshToken ? encrypt(params.refreshToken) : undefined,
      scopes: ["https://management.azure.com/user_impersonation"],
      metadata: { subscriptionId: params.subscriptionId, purpose: "cloud" },
    },
  });

  const cloudAccount = await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "AZURE",
        accountId: params.subscriptionId,
      },
    },
    update: {
      isActive: true,
      accountName: params.subscriptionName ?? params.subscriptionId,
      integrationId: integration.id,
    },
    create: {
      orgId: org.id,
      integrationId: integration.id,
      provider: "AZURE",
      accountId: params.subscriptionId,
      accountName: params.subscriptionName ?? params.subscriptionId,
      region: "global",
    },
  });

  return { integration, cloudAccount };
}
