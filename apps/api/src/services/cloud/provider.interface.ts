import type { ScanFinding } from "@vikela/shared";
import type {
  AccessKey,
  Alert,
  AuditEvent as CloudAuditEvent,
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
} from "./types.js";

export interface ICloudProvider {
  listUsers(): Promise<CloudUser[]>;
  listRoles(): Promise<CloudRole[]>;
  getMFAStatus(): Promise<MFAReport>;
  getAccessKeys(): Promise<AccessKey[]>;
  listServiceAccounts(): Promise<ServiceAccount[]>;
  isAuditLoggingEnabled(): Promise<boolean>;
  getAuditLogs(start: Date, end: Date): Promise<CloudAuditEvent[]>;
  getLogRetentionPolicy(): Promise<RetentionPolicy>;
  listStorageBuckets(): Promise<StorageBucket[]>;
  listEncryptionKeys(): Promise<EncryptionKey[]>;
  listDatabases(): Promise<DatabaseInstance[]>;
  listDisks(): Promise<Disk[]>;
  listFirewallRules(): Promise<FirewallRule[]>;
  getPublicEndpoints(): Promise<PublicEndpoint[]>;
  listVPCs(): Promise<VPC[]>;
  isMonitoringEnabled(): Promise<boolean>;
  listAlerts(): Promise<Alert[]>;
  getSecurityFindings(): Promise<SecurityFinding[]>;
  listBackupPolicies(): Promise<BackupPolicy[]>;
  runComplianceChecks(): Promise<ScanFinding[]>;
}
