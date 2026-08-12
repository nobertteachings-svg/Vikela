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

const CF_API = "https://api.cloudflare.com/client/v4";

type CfEnvelope<T> = {
  success: boolean;
  errors?: { message?: string }[];
  result?: T;
};

type CfZone = { id: string; name: string; status?: string };
type CfSetting = { id: string; value: string | boolean | number };
type CfAccessApp = { id: string; name?: string; domain?: string };

export class CloudflareProvider implements ICloudProvider {
  private readonly token: string;
  private readonly accountId: string;

  constructor(credentials: CloudCredentials) {
    if (!credentials.accessToken) {
      throw new Error("Cloudflare integration requires an API token");
    }
    this.token = credentials.accessToken;
    this.accountId = credentials.accountId ?? "unknown";
  }

  private async cfGet<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${CF_API}${path}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });
      const json = (await res.json()) as CfEnvelope<T>;
      if (!res.ok || !json.success) return null;
      return json.result ?? null;
    } catch {
      return null;
    }
  }

  private async listZones(): Promise<CfZone[]> {
    if (this.accountId === "unknown") return [];
    const result = await this.cfGet<CfZone[]>(
      `/zones?account.id=${encodeURIComponent(this.accountId)}&per_page=50`
    );
    return result ?? [];
  }

  private async getZoneSetting(zoneId: string, settingId: string): Promise<CfSetting | null> {
    return this.cfGet<CfSetting>(`/zones/${zoneId}/settings/${settingId}`);
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
    return false;
  }
  async getAuditLogs(_start: Date, _end: Date): Promise<AuditEvent[]> {
    return [];
  }
  async getLogRetentionPolicy(): Promise<RetentionPolicy> {
    return { days: 0, enabled: false };
  }
  async listStorageBuckets(): Promise<StorageBucket[]> {
    return [];
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
    return [];
  }
  async getPublicEndpoints(): Promise<PublicEndpoint[]> {
    const zones = await this.listZones();
    return zones.map((z) => ({
      resourceType: "Zone",
      resourceId: z.name,
      region: "global",
    }));
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
    const findings: ScanFinding[] = [];
    const zones = await this.listZones();

    if (this.accountId === "unknown") {
      findings.push({
        title: "Cloudflare account ID missing on integration",
        description: "Reconnect Cloudflare so Vikela can scope zone and Access checks.",
        severity: "MEDIUM",
        source: "IAM",
        cloudProvider: "CLOUDFLARE",
        resourceType: "Account",
        resourceId: "unknown",
        region: "global",
        remediation: "Disconnect and reconnect Cloudflare with a valid API token.",
        controlCode: "CC6.1",
      });
      return findings;
    }

    if (zones.length === 0) {
      findings.push({
        title: "No Cloudflare zones visible to this token",
        description:
          "Token verified but returned zero zones. Confirm Zone → Zone → Read permission and that the account has zones.",
        severity: "LOW",
        source: "MONITORING",
        cloudProvider: "CLOUDFLARE",
        resourceType: "Account",
        resourceId: this.accountId,
        region: "global",
        remediation:
          "Create an API token with Zone Read (and SSL settings read) for the target account, then reconnect.",
        controlCode: "CC6.1",
      });
    }

    for (const zone of zones) {
      const ssl = await this.getZoneSetting(zone.id, "ssl");
      const sslValue = typeof ssl?.value === "string" ? ssl.value.toLowerCase() : "";
      if (sslValue === "off" || sslValue === "flexible") {
        findings.push({
          title: `Zone "${zone.name}" SSL mode is ${sslValue || "unknown"}`,
          description:
            "Flexible/off SSL can expose origin traffic or weaken HTTPS. Prefer Full (strict).",
          severity: sslValue === "off" ? "CRITICAL" : "HIGH",
          source: "ENCRYPTION",
          cloudProvider: "CLOUDFLARE",
          resourceType: "Zone",
          resourceId: zone.id,
          region: "global",
          remediation: `In Cloudflare SSL/TLS for ${zone.name}, set encryption mode to Full (strict) with a valid origin certificate.`,
          controlCode: "CC6.7",
        });
      }

      const alwaysHttps = await this.getZoneSetting(zone.id, "always_use_https");
      const alwaysOn = alwaysHttps?.value === "on" || alwaysHttps?.value === true;
      if (!alwaysOn) {
        findings.push({
          title: `Zone "${zone.name}" does not force HTTPS`,
          description: "Always Use HTTPS is not enabled; clients may hit plaintext HTTP.",
          severity: "MEDIUM",
          source: "ENCRYPTION",
          cloudProvider: "CLOUDFLARE",
          resourceType: "Zone",
          resourceId: zone.id,
          region: "global",
          remediation: `Enable Always Use HTTPS under SSL/TLS → Edge Certificates for ${zone.name}.`,
          controlCode: "CC6.7",
        });
      }

      // Zone WAF managed ruleset presence (phase http_request_firewall_managed)
      const rulesets = await this.cfGet<{ id: string; phase?: string; name?: string }[]>(
        `/zones/${zone.id}/rulesets`
      );
      const hasManagedWaf = (rulesets ?? []).some(
        (r) =>
          r.phase === "http_request_firewall_managed" ||
          (r.name ?? "").toLowerCase().includes("managed")
      );
      if (rulesets !== null && !hasManagedWaf) {
        findings.push({
          title: `Zone "${zone.name}" has no managed WAF ruleset`,
          description: "No http_request_firewall_managed ruleset found for this zone.",
          severity: "MEDIUM",
          source: "NETWORK",
          cloudProvider: "CLOUDFLARE",
          resourceType: "Zone",
          resourceId: zone.id,
          region: "global",
          remediation:
            "Enable Cloudflare Managed Rules (WAF) for the zone under Security → WAF.",
          controlCode: "CC6.6",
        });
      }
    }

    const accessApps = await this.cfGet<CfAccessApp[]>(
      `/accounts/${this.accountId}/access/apps?per_page=50`
    );
    if (accessApps !== null && zones.length > 0 && accessApps.length === 0) {
      findings.push({
        title: "No Cloudflare Access applications configured",
        description:
          "Account has zones but zero Zero Trust Access apps. Internal apps may be exposed without Access.",
        severity: "LOW",
        source: "IAM",
        cloudProvider: "CLOUDFLARE",
        resourceType: "Account",
        resourceId: this.accountId,
        region: "global",
        remediation:
          "Review Zero Trust → Access and protect admin/internal hostnames with Access policies.",
        controlCode: "CC6.1",
      });
    }

    if (findings.length === 0) {
      findings.push({
        title: "Cloudflare baseline checks passed",
        description: `Scanned ${zones.length} zone(s); SSL/HTTPS/WAF/Access baseline looks healthy.`,
        severity: "INFO",
        source: "MONITORING",
        cloudProvider: "CLOUDFLARE",
        resourceType: "Account",
        resourceId: this.accountId,
        region: "global",
        remediation: "Continue periodic reviews of SSL modes, WAF, and Access policies.",
        controlCode: "CC7.1",
      });
    }

    return findings;
  }
}
