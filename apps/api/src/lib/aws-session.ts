import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

/** IAM access keys look like AKIA… / ASIA… — never a bare 12-digit account id. */
export function isValidAwsAccessKeyId(value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  return /^(AKIA|ASIA)[A-Z0-9]{16}$/.test(v);
}

/**
 * Resolve Vikela platform IAM credentials.
 * Falls back to AWS_S3_* when AWS_VIKELA_ACCESS_KEY_ID was mistakenly set to the account id.
 */
function resolveVikelaAccessKey(): { accessKeyId: string; secretAccessKey: string } | null {
  const vikelaKey = process.env.AWS_VIKELA_ACCESS_KEY_ID?.trim();
  const vikelaSecret = process.env.AWS_VIKELA_SECRET_ACCESS_KEY?.trim();
  if (vikelaKey && vikelaSecret && isValidAwsAccessKeyId(vikelaKey)) {
    return { accessKeyId: vikelaKey, secretAccessKey: vikelaSecret };
  }

  const s3Key = process.env.AWS_S3_ACCESS_KEY_ID?.trim();
  const s3Secret =
    process.env.AWS_S3_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_VIKELA_SECRET_ACCESS_KEY?.trim();
  if (s3Key && s3Secret && isValidAwsAccessKeyId(s3Key)) {
    return { accessKeyId: s3Key, secretAccessKey: s3Secret };
  }

  return null;
}

export function isVikelaAwsConfigured(): boolean {
  return resolveVikelaAccessKey() != null;
}

function vikelaCredentials() {
  const creds = resolveVikelaAccessKey();
  if (!creds) {
    throw new Error(
      "AWS_VIKELA_ACCESS_KEY_ID must be an IAM access key (AKIA…/ASIA…), not the AWS account id. Set AWS_VIKELA_ACCESS_KEY_ID and AWS_VIKELA_SECRET_ACCESS_KEY."
    );
  }
  return creds;
}

export async function assumeCustomerRole(
  roleArn: string,
  externalId?: string
): Promise<AwsCredentialIdentity> {
  if (!isVikelaAwsConfigured()) {
    throw new Error(
      "Vikela AWS credentials not configured. Set AWS_VIKELA_ACCESS_KEY_ID (AKIA…) and AWS_VIKELA_SECRET_ACCESS_KEY."
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
