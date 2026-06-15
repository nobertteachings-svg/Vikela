import { CloudTrailClient, DescribeTrailsCommand, GetTrailStatusCommand } from "@aws-sdk/client-cloudtrail";
import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

export interface CloudTrailStatus {
  hasMultiRegionTrail: boolean;
  loggingEnabled: boolean;
  regionsWithoutTrail: string[];
}

export async function auditCloudTrail(
  credentials: AwsCredentialIdentity
): Promise<CloudTrailStatus> {
  const ec2 = new EC2Client({ region: "us-east-1", credentials });
  const regionsRes = await ec2.send(new DescribeRegionsCommand({ AllRegions: true }));
  const regions = (regionsRes.Regions ?? [])
    .map((r) => r.RegionName)
    .filter((r): r is string => Boolean(r));

  let hasMultiRegionTrail = false;
  let loggingEnabled = false;
  const regionsWithoutTrail: string[] = [];

  for (const region of regions.slice(0, 12)) {
    const ct = new CloudTrailClient({ region, credentials });
    try {
      const trails = await ct.send(new DescribeTrailsCommand({}));
      const trailList = trails.trailList ?? [];
      if (trailList.length === 0) {
        regionsWithoutTrail.push(region);
        continue;
      }
      for (const trail of trailList) {
        if (trail.IsMultiRegionTrail) hasMultiRegionTrail = true;
        if (trail.Name) {
          const status = await ct.send(
            new GetTrailStatusCommand({ Name: trail.Name })
          );
          if (status.IsLogging) loggingEnabled = true;
        }
      }
    } catch {
      regionsWithoutTrail.push(region);
    }
  }

  return { hasMultiRegionTrail, loggingEnabled, regionsWithoutTrail };
}
