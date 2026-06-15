import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

export function isVikelaAwsConfigured(): boolean {
  return Boolean(
    process.env.AWS_VIKELA_ACCESS_KEY_ID && process.env.AWS_VIKELA_SECRET_ACCESS_KEY
  );
}

function vikelaCredentials() {
  return {
    accessKeyId: process.env.AWS_VIKELA_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_VIKELA_SECRET_ACCESS_KEY!,
  };
}

export async function assumeCustomerRole(
  roleArn: string,
  externalId?: string
): Promise<AwsCredentialIdentity> {
  if (!isVikelaAwsConfigured()) {
    throw new Error(
      "Vikela AWS credentials not configured. Set AWS_VIKELA_ACCESS_KEY_ID and AWS_VIKELA_SECRET_ACCESS_KEY."
    );
  }

  const region = process.env.AWS_VIKELA_REGION ?? "us-east-1";
  const sts = new STSClient({ region, credentials: vikelaCredentials() });

  const response = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `vikela-${Date.now()}`,
      ExternalId: externalId ?? process.env.AWS_EXTERNAL_ID,
      DurationSeconds: 3600,
    })
  );

  if (!response.Credentials?.AccessKeyId || !response.Credentials.SecretAccessKey) {
    throw new Error("AssumeRole did not return credentials");
  }

  return {
    accessKeyId: response.Credentials.AccessKeyId,
    secretAccessKey: response.Credentials.SecretAccessKey,
    sessionToken: response.Credentials.SessionToken,
  };
}

export async function verifyAssumeRole(roleArn: string, externalId?: string): Promise<{
  accountId: string;
  arn: string;
}> {
  const creds = await assumeCustomerRole(roleArn, externalId);
  const region = process.env.AWS_VIKELA_REGION ?? "us-east-1";
  const sts = new STSClient({ region, credentials: creds });
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  return {
    accountId: identity.Account ?? "unknown",
    arn: identity.Arn ?? roleArn,
  };
}
