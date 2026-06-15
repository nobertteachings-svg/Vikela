import type { ScanFinding } from "@vikela/shared";
import type { CloudProvider } from "@prisma/client";

export function demoCloudFindings(provider: CloudProvider): ScanFinding[] {
  const label = provider === "AZURE" ? "Azure" : provider === "GCP" ? "GCP" : provider;
  return [
    {
      title: `${label}: Activity log retention below 90 days (demo)`,
      description:
        "Subscription diagnostic settings should retain activity logs for at least 90 days for SOC 2 CC7.1.",
      severity: "HIGH",
      source: "LOGGING",
      cloudProvider: provider,
      resourceType: "ActivityLog",
      resourceId: "subscription",
      region: "global",
      remediation: `Enable ${label} audit logging with 90+ day retention. Connect live credentials for automated checks.`,
      controlCode: "CC7.1",
    },
    {
      title: `${label}: Storage account allows public blob access`,
      description: "One or more storage resources may allow anonymous public read access.",
      severity: "CRITICAL",
      source: "ENCRYPTION",
      cloudProvider: provider,
      resourceType: "StorageAccount",
      resourceId: "storage-demo",
      region: "global",
      remediation: "Disable public access on storage accounts and enforce private endpoints.",
      controlCode: "CC6.1",
    },
    {
      title: `${label}: Network security rule allows inbound from Internet`,
      description: "Overly permissive firewall/NSG rule detected on management ports.",
      severity: "HIGH",
      source: "NETWORK",
      cloudProvider: provider,
      resourceType: "FirewallRule",
      resourceId: "nsg-demo",
      region: "global",
      remediation: "Restrict inbound rules to known CIDR ranges; use bastion or VPN.",
      controlCode: "CC6.6",
    },
  ];
}

export function isDemoCloudToken(token?: string): boolean {
  return !token || token === "demo" || token === "demo-token" || token.startsWith("pending");
}
