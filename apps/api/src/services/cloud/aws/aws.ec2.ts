import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { FirewallRule } from "../types.js";

const SENSITIVE_PORTS = new Set([22, 3389, 3306, 5432, 6379, 27017]);

export async function auditSecurityGroups(
  credentials: AwsCredentialIdentity,
  region = "us-east-1"
): Promise<FirewallRule[]> {
  const ec2 = new EC2Client({ region, credentials });
  const res = await ec2.send(new DescribeSecurityGroupsCommand({}));
  const rules: FirewallRule[] = [];

  for (const sg of res.SecurityGroups ?? []) {
    for (const perm of sg.IpPermissions ?? []) {
      const from = perm.FromPort ?? 0;
      const to = perm.ToPort ?? from;
      for (const range of perm.IpRanges ?? []) {
        if (range.CidrIp === "0.0.0.0/0") {
          const portLabel = from === to ? String(from) : `${from}-${to}`;
          const isSensitive =
            SENSITIVE_PORTS.has(from) ||
            SENSITIVE_PORTS.has(to) ||
            (from <= 22 && to >= 22);
          if (isSensitive || from === 0) {
            rules.push({
              id: sg.GroupId ?? "unknown",
              direction: "ingress",
              ports: portLabel === "0" ? "all" : portLabel,
              source: "0.0.0.0/0",
            });
          }
        }
      }
    }
  }

  return rules;
}
