export interface CloudCredentials {
  /** AWS cross-account role ARN — never store long-lived customer keys */
  roleArn?: string;
  /** External ID for STS AssumeRole (recommended) */
  externalId?: string;
  accessToken?: string;
  refreshToken?: string;
  projectId?: string;
  subscriptionId?: string;
}

export interface AuditEvent {
  action: string;
  actor: string;
  timestamp: string;
}

export interface CloudUser {
  id: string;
  name: string;
  mfaEnabled: boolean;
}

export interface CloudRole {
  id: string;
  name: string;
  attachedPolicies: string[];
}

export interface MFAReport {
  totalUsers: number;
  mfaEnabled: number;
  mfaDisabled: number;
}

export interface AccessKey {
  userId: string;
  keyId: string;
  ageDays: number;
  lastUsed?: string;
}

export interface ServiceAccount {
  id: string;
  email: string;
  keyCount: number;
}

export interface RetentionPolicy {
  days: number;
  enabled: boolean;
}

export interface StorageBucket {
  name: string;
  region: string;
  publicAccess: boolean;
  encrypted: boolean;
  versioning: boolean;
}

export interface EncryptionKey {
  id: string;
  rotationEnabled: boolean;
}

export interface DatabaseInstance {
  id: string;
  engine: string;
  encrypted: boolean;
  publiclyAccessible: boolean;
}

export interface Disk {
  id: string;
  encrypted: boolean;
}

export interface FirewallRule {
  id: string;
  direction: string;
  ports: string;
  source: string;
}

export interface PublicEndpoint {
  resourceType: string;
  resourceId: string;
  region: string;
}

export interface VPC {
  id: string;
  flowLogsEnabled: boolean;
}

export interface Alert {
  id: string;
  name: string;
  enabled: boolean;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: string;
  resourceId: string;
}

export interface BackupPolicy {
  resourceId: string;
  enabled: boolean;
  retentionDays: number;
}
