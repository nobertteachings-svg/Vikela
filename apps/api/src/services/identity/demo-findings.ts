import type { ScanFinding } from "@vikela/shared";

export function demoIdentityFindings(provider: string): ScanFinding[] {
  return [
    {
      title: `${provider}: 3 users without MFA enrolled`,
      description:
        "Active directory users were found without a registered MFA factor. SOC 2 CC6.1 requires strong authentication for access to systems.",
      severity: "HIGH",
      source: "IAM",
      resourceType: "User",
      resourceId: "user-1,user-2,user-3",
      remediation:
        "Enforce MFA enrollment via your IdP policy. Block sign-in for users without MFA after a grace period.",
      controlCode: "CC6.1",
    },
    {
      title: `${provider}: 2 inactive users (>90 days)`,
      description: "User accounts have not signed in for more than 90 days but remain active.",
      severity: "MEDIUM",
      source: "IAM",
      resourceType: "User",
      resourceId: "inactive-users",
      remediation:
        "Disable or remove dormant accounts. Automate lifecycle reviews quarterly.",
      controlCode: "CC6.2",
    },
    {
      title: `${provider}: Password policy does not require MFA`,
      description: "Organization password / sign-on policy does not mandate MFA for all users.",
      severity: "HIGH",
      source: "IAM",
      resourceType: "Policy",
      resourceId: "password-policy",
      remediation: "Update sign-on policy to require MFA for all users and privileged roles.",
      controlCode: "CC6.1",
    },
  ];
}
