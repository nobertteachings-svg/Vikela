import type { ScanFinding } from "@vikela/shared";
import type { ICloudProvider } from "../provider.interface.js";
import type { CloudCredentials } from "../types.js";
import type {
  AccessKey,
  Alert,
  AuditEvent,
  BackupPolicy,
  CloudRole,
  CloudUser,
  DatabaseInstance,
  Disk,
  EncryptionKey,
  FirewallRule,
  MFAReport,
  PublicEndpoint,
  RetentionPolicy,
  SecurityFinding,
  ServiceAccount,
  StorageBucket,
  VPC,
} from "../types.js";
import { isDemoCloudToken, resolveDemoCloudFindings } from "../demo-cloud-findings.js";

type ArmStorage = {
  value?: { id: string; name: string; properties?: { allowBlobPublicAccess?: boolean } }[];
};

type ArmNsg = {
  value?: {
    id: string;
    name: string;
    properties?: {
      securityRules?: { properties?: { access?: string; direction?: string; sourceAddressPrefix?: string; destinationPortRange?: string } }[];
    };
  }[];
};

export class AzureProvider implements ICloudProvider {
  private readonly subscriptionId: string;
  private readonly token: string;

  constructor(credentials: CloudCredentials) {
    if (!credentials.accessToken) {
      throw new Error("Azure cloud integration requires OAuth access token");
    }
    this.token = credentials.accessToken;
    this.subscriptionId = credentials.subscriptionId ?? "unknown";
  }

  private async armGet<T>(path: string): Promise<T | null> {
    if (isDemoCloudToken(this.token)) return null;
    const url = path.startsWith("http")
      ? path
      : `https://management.azure.com${path}?api-version=2023-01-01`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  }

  async listUsers(): Promise<CloudUser[]> {
    return [];
  }
  async listRoles(): Promise<CloudRole[]> {
    return [];
  }
  async getMFAStatus(): Promise<MFAReport> {
    return { totalUsers: 0, mfaEnabled: 0, mfaDisabled: 0 };
  }
  async getAccessKeys(): Promise<AccessKey[]> {
    return [];
  }
  async listServiceAccounts(): Promise<ServiceAccount[]> {
    return [];
  }
  async isAuditLoggingEnabled(): Promise<boolean> {
    const settings = await this.armGet<{ value?: unknown[] }>(
      `/subscriptions/${this.subscriptionId}/providers/Microsoft.Insights/diagnosticSettings`
    );
    return (settings?.value?.length ?? 0) > 0;
  }
  async getAuditLogs(): Promise<AuditEvent[]> {
    return [];
  }
  async getLogRetentionPolicy(): Promise<RetentionPolicy> {
    const enabled = await this.isAuditLoggingEnabled();
    return { days: enabled ? 90 : 0, enabled };
  }
  async listStorageBuckets(): Promise<StorageBucket[]> {
    const data = await this.armGet<ArmStorage>(
      `/subscriptions/${this.subscriptionId}/providers/Microsoft.Storage/storageAccounts`
    );
    return (data?.value ?? []).map((s) => ({
      name: s.name,
      region: "global",
      publicAccess: s.properties?.allowBlobPublicAccess === true,
      encrypted: true,
      versioning: false,
    }));
  }
  async listEncryptionKeys(): Promise<EncryptionKey[]> {
    return [];
  }
  async listDatabases(): Promise<DatabaseInstance[]> {
    return [];
  }
  async listDisks(): Promise<Disk[]> {
    return [];
  }
  async listFirewallRules(): Promise<FirewallRule[]> {
    const rules: FirewallRule[] = [];
    const nsgs = await this.armGet<ArmNsg>(
      `/subscriptions/${this.subscriptionId}/providers/Microsoft.Network/networkSecurityGroups`
    );
    for (const nsg of nsgs?.value ?? []) {
      for (const rule of nsg.properties?.securityRules ?? []) {
        const p = rule.properties;
        if (
          p?.access === "Allow" &&
          p.direction === "Inbound" &&
          (p.sourceAddressPrefix === "*" || p.sourceAddressPrefix === "Internet")
        ) {
          rules.push({
            id: nsg.id,
            direction: "inbound",
            ports: p.destinationPortRange ?? "any",
            source: p.sourceAddressPrefix ?? "*",
          });
        }
      }
    }
    return rules;
  }
  async getPublicEndpoints(): Promise<PublicEndpoint[]> {
    return [];
  }
  async listVPCs(): Promise<VPC[]> {
    return [];
  }
  async isMonitoringEnabled(): Promise<boolean> {
    return false;
  }
  async listAlerts(): Promise<Alert[]> {
    return [];
  }
  async getSecurityFindings(): Promise<SecurityFinding[]> {
    return [];
  }
  async listBackupPolicies(): Promise<BackupPolicy[]> {
    return [];
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    const demo = resolveDemoCloudFindings("AZURE", this.token, this.subscriptionId);
    if (demo !== null) return demo;

    const findings: ScanFinding[] = [];

    const auditEnabled = await this.isAuditLoggingEnabled();
    if (!auditEnabled) {
      findings.push({
        title: "Azure Activity Log diagnostic settings not configured",
        description: "No subscription-level diagnostic settings found for audit logging.",
        severity: "HIGH",
        source: "LOGGING",
        cloudProvider: "AZURE",
        resourceType: "DiagnosticSettings",
        resourceId: this.subscriptionId,
        region: "global",
        remediation:
          "Export Activity Log to Log Analytics or Storage with ≥90 day retention.",
        controlCode: "CC7.1",
      });
    }

    const buckets = await this.listStorageBuckets();
    for (const b of buckets.filter((x) => x.publicAccess)) {
      findings.push({
        title: `Azure storage "${b.name}" allows public blob access`,
        description: "allowBlobPublicAccess is enabled on the storage account.",
        severity: "CRITICAL",
        source: "ENCRYPTION",
        cloudProvider: "AZURE",
        resourceType: "StorageAccount",
        resourceId: b.name,
        region: b.region,
        remediation: "Set allowBlobPublicAccess to false and review container ACLs.",
        controlCode: "CC6.1",
      });
    }

    const fw = await this.listFirewallRules();
    for (const rule of fw.slice(0, 5)) {
      findings.push({
        title: `NSG ${rule.id} allows inbound from ${rule.source}`,
        description: `Permissive rule on port ${rule.ports}.`,
        severity: rule.ports === "22" || rule.ports === "*" ? "HIGH" : "MEDIUM",
        source: "NETWORK",
        cloudProvider: "AZURE",
        resourceType: "NetworkSecurityGroup",
        resourceId: rule.id,
        region: "global",
        remediation: "Tighten NSG rules to least-privilege CIDR ranges.",
        controlCode: "CC6.6",
      });
    }

    // Live credentials: return real findings only (empty = clean posture for checked controls).
    return findings;
  }
}
