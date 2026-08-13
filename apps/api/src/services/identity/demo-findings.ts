import type { ScanFinding } from "@vikela/shared";
import { isDemoConnectAllowed } from "../../lib/auth.js";

/**
 * Demo identity findings, only when ALLOW_DEMO_INTEGRATIONS=true and not production.
 */
export function demoIdentityFindings(provider: string): ScanFinding[] {
  if (!isDemoConnectAllowed()) return [];

  return [
    {
      title: `${provider}: 3 users without MFA enrolled (demo)`,
      description:
        "Demo data: MFA enrollment gaps. Connect live credentials for real checks.",
      severity: "HIGH",
      source: "IAM",
      resourceType: "User",
      resourceId: "demo-user-1,demo-user-2,demo-user-3",
      remediation:
        "Enforce MFA enrollment via your IdP policy. Block sign-in for users without MFA after a grace period.",
      controlCode: "CC6.1",
    },
    {
      title: `${provider}: 2 inactive users (>90 days) (demo)`,
      description: "Demo data: dormant accounts. Connect live credentials for real checks.",
      severity: "MEDIUM",
      source: "IAM",
      resourceType: "User",
      resourceId: "inactive-users-demo",
      remediation:
        "Disable or remove dormant accounts. Automate lifecycle reviews quarterly.",
      controlCode: "CC6.2",
    },
    {
      title: `${provider}: Password policy does not require MFA (demo)`,
      description: "Demo data: policy check. Connect live credentials for real checks.",
      severity: "HIGH",
      source: "IAM",
      resourceType: "Policy",
      resourceId: "password-policy-demo",
      remediation: "Update sign-on policy to require MFA for all users and privileged roles.",
      controlCode: "CC6.1",
    },
  ];
}
