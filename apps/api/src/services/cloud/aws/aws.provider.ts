import type { ScanFinding } from "@vikela/shared";
import type { ICloudProvider } from "../provider.interface.js";
import type {
  AccessKey,
  Alert,
  AuditEvent,
  BackupPolicy,
  CloudCredentials,
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
import { assumeCustomerRole, isVikelaAwsConfigured } from "../../../lib/aws-session.js";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import { fetchIamUsers, fetchMfaReport, fetchStaleAccessKeys } from "./aws.iam.js";
import { auditCloudTrail } from "./aws.cloudtrail.js";
import { auditS3Buckets } from "./aws.s3.js";
import { auditGuardDuty } from "./aws.guardduty.js";
import { auditSecurityGroups } from "./aws.ec2.js";

export class AWSProvider implements ICloudProvider {
  private session: AwsCredentialIdentity | null = null;
  private readonly roleArn: string;
  private readonly externalId?: string;

  constructor(private readonly credentials: CloudCredentials) {
    if (!credentials.roleArn) {
      throw new Error("AWS connection requires roleArn in integration metadata");
    }
    this.roleArn = credentials.roleArn;
    this.externalId = credentials.externalId;
  }

  private async getSession(): Promise<AwsCredentialIdentity> {
    if (this.session) return this.session;
    this.session = await assumeCustomerRole(this.roleArn, this.externalId);
    return this.session;
  }

  async listUsers(): Promise<CloudUser[]> {
    return fetchIamUsers(await this.getSession());
  }

  async listRoles(): Promise<CloudRole[]> {
    return [];
  }

  async getMFAStatus(): Promise<MFAReport> {
    return fetchMfaReport(await this.getSession());
  }

  async getAccessKeys(): Promise<AccessKey[]> {
    return fetchStaleAccessKeys(await this.getSession());
  }

  async listServiceAccounts(): Promise<ServiceAccount[]> {
    return [];
  }

  async isAuditLoggingEnabled(): Promise<boolean> {
    const ct = await auditCloudTrail(await this.getSession());
    return ct.loggingEnabled || ct.hasMultiRegionTrail;
  }

  async getAuditLogs(_start: Date, _end: Date): Promise<AuditEvent[]> {
    return [];
  }

  async getLogRetentionPolicy(): Promise<RetentionPolicy> {
    const enabled = await this.isAuditLoggingEnabled();
    return { days: enabled ? 90 : 0, enabled };
  }

  async listStorageBuckets(): Promise<StorageBucket[]> {
    return auditS3Buckets(await this.getSession());
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
    const region = process.env.AWS_VIKELA_REGION ?? "us-east-1";
    return auditSecurityGroups(await this.getSession(), region);
  }

  async getPublicEndpoints(): Promise<PublicEndpoint[]> {
    return [];
  }

  async listVPCs(): Promise<VPC[]> {
    return [];
  }

  async isMonitoringEnabled(): Promise<boolean> {
    const gd = await auditGuardDuty(
      await this.getSession(),
      process.env.AWS_VIKELA_REGION ?? "us-east-1"
    );
    return gd.enabled;
  }

  async listAlerts(): Promise<Alert[]> {
    return [];
  }

  async getSecurityFindings(): Promise<SecurityFinding[]> {
    const gd = await auditGuardDuty(
      await this.getSession(),
      process.env.AWS_VIKELA_REGION ?? "us-east-1"
    );
    return gd.findings;
  }

  async listBackupPolicies(): Promise<BackupPolicy[]> {
    return [];
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (!isVikelaAwsConfigured()) {
      return demoAwsFindings();
    }

    const creds = await this.getSession();
    const findings: ScanFinding[] = [];
    const region = process.env.AWS_VIKELA_REGION ?? "us-east-1";

    const cloudTrail = await auditCloudTrail(creds);
    if (!cloudTrail.loggingEnabled && !cloudTrail.hasMultiRegionTrail) {
      findings.push({
        title: "CloudTrail logging not enabled",
        description:
          "No active CloudTrail trail with logging was detected. SOC 2 CC7.1 requires audit logs.",
        severity: "HIGH",
        source: "LOGGING",
        cloudProvider: "AWS",
        resourceType: "CloudTrail",
        resourceId: "account-wide",
        region: "all",
        remediation:
          "Create a multi-region CloudTrail trail with log file validation and S3 delivery.",
        controlCode: "CC7.1",
      });
    }

    const mfa = await fetchMfaReport(creds);
    if (mfa.mfaDisabled > 0) {
      findings.push({
        title: `${mfa.mfaDisabled} IAM user(s) without MFA`,
        description: `${mfa.mfaDisabled} of ${mfa.totalUsers} IAM users do not have MFA enabled.`,
        severity: mfa.mfaDisabled > 2 ? "HIGH" : "MEDIUM",
        source: "IAM",
        cloudProvider: "AWS",
        resourceType: "IAMUser",
        resourceId: "multiple",
        region: "global",
        remediation:
          "Enable MFA for all IAM users. Apply an IAM policy that denies sensitive actions without aws:MultiFactorAuthPresent.",
        controlCode: "CC6.1",
      });
    }

    const staleKeys = await fetchStaleAccessKeys(creds);
    for (const key of staleKeys.slice(0, 5)) {
      findings.push({
        title: `IAM access key older than 90 days: ${key.keyId}`,
        description: `Access key for user ${key.userId} is ${key.ageDays} days old.`,
        severity: "MEDIUM",
        source: "IAM",
        cloudProvider: "AWS",
        resourceType: "IAMAccessKey",
        resourceId: key.keyId,
        region: "global",
        remediation: "Rotate access keys every 90 days. Prefer IAM roles over long-lived keys.",
        controlCode: "CC6.1",
      });
    }

    const buckets = await auditS3Buckets(creds);
    for (const bucket of buckets) {
      if (bucket.publicAccess) {
        findings.push({
          title: `S3 bucket "${bucket.name}" may allow public access`,
          description: "Public access block is not fully enabled on this bucket.",
          severity: "CRITICAL",
          source: "ENCRYPTION",
          cloudProvider: "AWS",
          resourceType: "S3Bucket",
          resourceId: bucket.name,
          region: bucket.region,
          remediation:
            "Enable S3 Block Public Access at account and bucket level. Audit bucket policies and ACLs.",
          controlCode: "CC6.1",
        });
      }
      if (!bucket.encrypted) {
        findings.push({
          title: `S3 bucket "${bucket.name}" lacks default encryption`,
          description: "Server-side encryption is not configured by default.",
          severity: "MEDIUM",
          source: "ENCRYPTION",
          cloudProvider: "AWS",
          resourceType: "S3Bucket",
          resourceId: bucket.name,
          region: bucket.region,
          remediation: "Enable SSE-S3 or SSE-KMS default encryption on the bucket.",
          controlCode: "CC6.7",
        });
      }
    }

    const guardDuty = await auditGuardDuty(creds, region);
    if (!guardDuty.enabled) {
      findings.push({
        title: "GuardDuty is not enabled",
        description: "Amazon GuardDuty threat detection is disabled in the primary region.",
        severity: "HIGH",
        source: "MONITORING",
        cloudProvider: "AWS",
        resourceType: "GuardDuty",
        resourceId: region,
        region,
        remediation: "Enable GuardDuty in all active regions. Review findings in Security Hub.",
        controlCode: "CC7.2",
      });
    } else {
      for (const f of guardDuty.findings.slice(0, 5)) {
        findings.push({
          title: `GuardDuty: ${f.title}`,
          description: `Active GuardDuty finding (${f.severity}) on ${f.resourceId}.`,
          severity: f.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          source: "MONITORING",
          cloudProvider: "AWS",
          resourceType: "GuardDutyFinding",
          resourceId: f.id,
          region,
          remediation: "Investigate and remediate the GuardDuty finding. Document in your incident log.",
          controlCode: "CC7.4",
        });
      }
    }

    const sgRules = await auditSecurityGroups(creds, region);
    for (const rule of sgRules.slice(0, 5)) {
      findings.push({
        title: `Security group ${rule.id} allows ${rule.source} on port ${rule.ports}`,
        description: "Overly permissive inbound rule detected.",
        severity: rule.ports === "22" || rule.ports === "all" ? "HIGH" : "MEDIUM",
        source: "NETWORK",
        cloudProvider: "AWS",
        resourceType: "SecurityGroup",
        resourceId: rule.id,
        region,
        remediation:
          "Restrict ingress to known CIDR ranges. Use SSM Session Manager instead of open SSH.",
        controlCode: "CC6.6",
      });
    }

    return findings;
  }
}

function demoAwsFindings(): ScanFinding[] {
  return [
    {
      title: "CloudTrail logging not enabled (demo)",
      description: "Demo mode — configure AWS_VIKELA_* env vars for live scans.",
      severity: "HIGH",
      source: "LOGGING",
      cloudProvider: "AWS",
      resourceType: "CloudTrail",
      resourceId: "account-wide",
      region: "all",
      remediation: "Connect AWS with AssumeRole and run a live cloud scan.",
      controlCode: "CC7.1",
    },
  ];
}
