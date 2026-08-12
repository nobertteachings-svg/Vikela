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

export class GCPProvider implements ICloudProvider {
  private readonly token: string;
  private readonly projectId: string;

  constructor(credentials: CloudCredentials) {
    if (!credentials.accessToken) {
      throw new Error("GCP integration requires OAuth access token");
    }
    this.token = credentials.accessToken;
    this.projectId = credentials.projectId ?? "unknown";
  }

  private async gcpFetch<T>(url: string): Promise<T | null> {
    if (isDemoCloudToken(this.token)) return null;
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
    const data = await this.gcpFetch<{ accounts?: { name: string; email: string }[] }>(
      `https://iam.googleapis.com/v1/projects/${this.projectId}/serviceAccounts`
    );
    return (data?.accounts ?? []).map((a) => ({
      id: a.name,
      email: a.email,
      keyCount: 0,
    }));
  }
  async isAuditLoggingEnabled(): Promise<boolean> {
    const sinks = await this.gcpFetch<{ sinks?: unknown[] }>(
      `https://logging.googleapis.com/v2/projects/${this.projectId}/sinks`
    );
    return (sinks?.sinks?.length ?? 0) > 0;
  }
  async getAuditLogs(): Promise<AuditEvent[]> {
    return [];
  }
  async getLogRetentionPolicy(): Promise<RetentionPolicy> {
    const enabled = await this.isAuditLoggingEnabled();
    return { days: enabled ? 90 : 0, enabled };
  }
  async listStorageBuckets(): Promise<StorageBucket[]> {
    const data = await this.gcpFetch<{ items?: { name: string; iamConfiguration?: { publicAccessPrevention?: string } }[] }>(
      `https://storage.googleapis.com/storage/v1/b?project=${this.projectId}`
    );
    return (data?.items ?? []).map((b) => ({
      name: b.name,
      region: "global",
      publicAccess: b.iamConfiguration?.publicAccessPrevention !== "enforced",
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
    const data = await this.gcpFetch<{
      items?: { name: string; allowed?: { ports?: string[] }[]; sourceRanges?: string[] }[];
    }>(
      `https://compute.googleapis.com/compute/v1/projects/${this.projectId}/global/firewalls`
    );
    const rules: FirewallRule[] = [];
    for (const fw of data?.items ?? []) {
      const openInternet = fw.sourceRanges?.includes("0.0.0.0/0");
      if (openInternet) {
        rules.push({
          id: fw.name,
          direction: "inbound",
          ports: fw.allowed?.[0]?.ports?.join(",") ?? "any",
          source: "0.0.0.0/0",
        });
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
    const demo = resolveDemoCloudFindings("GCP", this.token, this.projectId);
    if (demo !== null) return demo;

    const findings: ScanFinding[] = [];

    if (!(await this.isAuditLoggingEnabled())) {
      findings.push({
        title: "GCP Cloud Logging export sink not configured",
        description: "No log sinks found for centralized audit retention.",
        severity: "HIGH",
        source: "LOGGING",
        cloudProvider: "GCP",
        resourceType: "LogSink",
        resourceId: this.projectId,
        region: "global",
        remediation: "Create a log sink to BigQuery or Cloud Storage with 90+ day retention.",
        controlCode: "CC7.1",
      });
    }

    const buckets = await this.listStorageBuckets();
    for (const b of buckets.filter((x) => x.publicAccess)) {
      findings.push({
        title: `GCS bucket "${b.name}" lacks public access prevention`,
        description: "Bucket does not enforce publicAccessPrevention.",
        severity: "CRITICAL",
        source: "ENCRYPTION",
        cloudProvider: "GCP",
        resourceType: "GCSBucket",
        resourceId: b.name,
        region: "global",
        remediation: "Enforce uniform bucket-level access and public access prevention.",
        controlCode: "CC6.1",
      });
    }

    const fw = await this.listFirewallRules();
    for (const rule of fw.slice(0, 5)) {
      findings.push({
        title: `Firewall ${rule.id} allows ${rule.source}`,
        description: `Open rule on ports ${rule.ports}.`,
        severity: "HIGH",
        source: "NETWORK",
        cloudProvider: "GCP",
        resourceType: "Firewall",
        resourceId: rule.id,
        region: "global",
        remediation: "Remove 0.0.0.0/0 ingress except where required and documented.",
        controlCode: "CC6.6",
      });
    }

    const sas = await this.listServiceAccounts();
    if (sas.length > 20) {
      findings.push({
        title: `${sas.length} GCP service accounts in project`,
        description: "Large number of service accounts increases key sprawl risk.",
        severity: "LOW",
        source: "IAM",
        cloudProvider: "GCP",
        resourceType: "ServiceAccount",
        resourceId: this.projectId,
        region: "global",
        remediation: "Review and decommission unused service accounts quarterly.",
        controlCode: "CC6.2",
      });
    }

    // Live credentials: return real findings only (empty = clean posture for checked controls).
    return findings;
  }
}
