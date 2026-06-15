import {
  GuardDutyClient,
  ListDetectorsCommand,
  ListFindingsCommand,
  GetFindingsCommand,
} from "@aws-sdk/client-guardduty";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { SecurityFinding } from "../types.js";

export async function auditGuardDuty(
  credentials: AwsCredentialIdentity,
  region = "us-east-1"
): Promise<{ enabled: boolean; findings: SecurityFinding[] }> {
  const gd = new GuardDutyClient({ region, credentials });

  try {
    const detectors = await gd.send(new ListDetectorsCommand({}));
    const detectorId = detectors.DetectorIds?.[0];

    if (!detectorId) {
      return { enabled: false, findings: [] };
    }

    const list = await gd.send(
      new ListFindingsCommand({
        DetectorId: detectorId,
        MaxResults: 20,
      })
    );

    const findings: SecurityFinding[] = [];
    if (list.FindingIds?.length) {
      const detail = await gd.send(
        new GetFindingsCommand({
          DetectorId: detectorId,
          FindingIds: list.FindingIds.slice(0, 10),
        })
      );
      for (const f of detail.Findings ?? []) {
        const sev = f.Severity ?? 5;
        if (sev < 4) continue;
        findings.push({
          id: f.Id ?? "unknown",
          title: f.Title ?? "GuardDuty finding",
          severity: sev >= 7 ? "CRITICAL" : sev >= 5 ? "HIGH" : "MEDIUM",
          resourceId:
            f.Resource?.InstanceDetails?.InstanceId ??
            f.Resource?.S3BucketDetails?.[0]?.Name ??
            "unknown",
        });
      }
    }

    return { enabled: true, findings };
  } catch {
    return { enabled: false, findings: [] };
  }
}
