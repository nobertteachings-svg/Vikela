import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { verifyAssumeRole, isVikelaAwsConfigured } from "../../../lib/aws-session.js";

export async function connectAwsAccount(params: {
  roleArn: string;
  externalId?: string;
  accountName?: string;
  region?: string;
  orgSlug: string;
}) {
  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  let accountId = "demo-aws-account";
  let verified = false;

  if (isVikelaAwsConfigured()) {
    const identity = await verifyAssumeRole(params.roleArn, params.externalId);
    accountId = identity.accountId;
    verified = true;
  }

  const metadata = {
    roleArn: params.roleArn,
    externalId: params.externalId ?? process.env.AWS_EXTERNAL_ID,
    verified,
  };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "AWS",
        externalId: accountId,
      },
    },
    update: {
      isActive: true,
      name: params.accountName ?? `AWS ${accountId}`,
      accessToken: encrypt("assume-role"),
      metadata,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "AWS",
      category: "CLOUD",
      name: params.accountName ?? `AWS ${accountId}`,
      externalId: accountId,
      accessToken: encrypt("assume-role"),
      scopes: [],
      metadata,
    },
  });

  const cloudAccount = await prisma.cloudAccount.upsert({
    where: {
      orgId_provider_accountId: {
        orgId: org.id,
        provider: "AWS",
        accountId,
      },
    },
    update: {
      integrationId: integration.id,
      accountName: params.accountName ?? `AWS ${accountId}`,
      region: params.region ?? process.env.AWS_VIKELA_REGION ?? "us-east-1",
      isActive: true,
    },
    create: {
      orgId: org.id,
      integrationId: integration.id,
      provider: "AWS",
      accountId,
      accountName: params.accountName ?? `AWS ${accountId}`,
      region: params.region ?? process.env.AWS_VIKELA_REGION ?? "us-east-1",
      environment: "PRODUCTION",
    },
  });

  return { integration, cloudAccount, verified };
}
