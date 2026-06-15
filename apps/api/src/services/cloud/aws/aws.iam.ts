import {
  IAMClient,
  ListUsersCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
} from "@aws-sdk/client-iam";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { AccessKey, CloudUser, MFAReport } from "../types.js";

export async function fetchIamUsers(credentials: AwsCredentialIdentity): Promise<CloudUser[]> {
  const iam = new IAMClient({ region: "us-east-1", credentials });
  const users: CloudUser[] = [];
  let marker: string | undefined;

  do {
    const res = await iam.send(new ListUsersCommand({ Marker: marker }));
    for (const u of res.Users ?? []) {
      if (!u.UserName) continue;
      const mfa = await iam.send(new ListMFADevicesCommand({ UserName: u.UserName }));
      users.push({
        id: u.UserId ?? u.UserName,
        name: u.UserName,
        mfaEnabled: (mfa.MFADevices?.length ?? 0) > 0,
      });
    }
    marker = res.IsTruncated ? res.Marker : undefined;
  } while (marker);

  return users;
}

export async function fetchMfaReport(credentials: AwsCredentialIdentity): Promise<MFAReport> {
  const users = await fetchIamUsers(credentials);
  const mfaEnabled = users.filter((u) => u.mfaEnabled).length;
  return {
    totalUsers: users.length,
    mfaEnabled,
    mfaDisabled: users.length - mfaEnabled,
  };
}

export async function fetchStaleAccessKeys(
  credentials: AwsCredentialIdentity,
  maxAgeDays = 90
): Promise<AccessKey[]> {
  const iam = new IAMClient({ region: "us-east-1", credentials });
  const keys: AccessKey[] = [];
  const usersRes = await iam.send(new ListUsersCommand({}));
  const now = Date.now();

  for (const u of usersRes.Users ?? []) {
    if (!u.UserName) continue;
    const keyRes = await iam.send(new ListAccessKeysCommand({ UserName: u.UserName }));
    for (const k of keyRes.AccessKeyMetadata ?? []) {
      if (!k.AccessKeyId) continue;
      let lastUsed: string | undefined;
      try {
        const usage = await iam.send(
          new GetAccessKeyLastUsedCommand({ AccessKeyId: k.AccessKeyId })
        );
        lastUsed = usage.AccessKeyLastUsed?.LastUsedDate?.toISOString();
      } catch {
        /* ignore */
      }
      const created = k.CreateDate?.getTime() ?? now;
      const ageDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (ageDays > maxAgeDays) {
        keys.push({
          userId: u.UserName,
          keyId: k.AccessKeyId,
          ageDays,
          lastUsed,
        });
      }
    }
  }

  return keys;
}
