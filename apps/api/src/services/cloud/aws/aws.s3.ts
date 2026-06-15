import {
  S3Client,
  ListBucketsCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketLocationCommand,
} from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { StorageBucket } from "../types.js";

export async function auditS3Buckets(
  credentials: AwsCredentialIdentity
): Promise<StorageBucket[]> {
  const s3 = new S3Client({ region: "us-east-1", credentials });
  const list = await s3.send(new ListBucketsCommand({}));
  const buckets: StorageBucket[] = [];

  for (const b of list.Buckets ?? []) {
    if (!b.Name) continue;
    const region = await getBucketRegion(s3, b.Name);
    let publicAccess = false;
    let encrypted = false;
    let versioning = false;

    try {
      const pab = await s3.send(
        new GetPublicAccessBlockCommand({ Bucket: b.Name })
      );
      const cfg = pab.PublicAccessBlockConfiguration;
      publicAccess = !(
        cfg?.BlockPublicAcls &&
        cfg?.BlockPublicPolicy &&
        cfg?.IgnorePublicAcls &&
        cfg?.RestrictPublicBuckets
      );
    } catch {
      publicAccess = true;
    }

    try {
      await s3.send(new GetBucketEncryptionCommand({ Bucket: b.Name }));
      encrypted = true;
    } catch {
      encrypted = false;
    }

    buckets.push({
      name: b.Name,
      region,
      publicAccess,
      encrypted,
      versioning,
    });
  }

  return buckets;
}

async function getBucketRegion(s3: S3Client, bucket: string): Promise<string> {
  try {
    const loc = await s3.send(new GetBucketLocationCommand({ Bucket: bucket }));
    const r = loc.LocationConstraint;
    return r === null || r === undefined ? "us-east-1" : String(r);
  } catch {
    return "us-east-1";
  }
}
