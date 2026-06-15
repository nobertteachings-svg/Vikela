export interface IdentityUser {
  id: string;
  email: string;
  mfaEnabled: boolean;
  lastLogin?: string;
}

export interface IdentityGroup {
  id: string;
  name: string;
  memberCount: number;
}

export interface MFAEnrollment {
  userId: string;
  factorType: string;
  enrolled: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireMfa: boolean;
  maxAgeDays: number;
}

export interface IdentityAuditEvent {
  action: string;
  actor: string;
  timestamp: string;
}

import type { ScanFinding } from "@vikela/shared";

export interface IIdentityProvider {
  listUsers(): Promise<IdentityUser[]>;
  listGroups(): Promise<IdentityGroup[]>;
  getMFAEnrollment(): Promise<MFAEnrollment[]>;
  getInactiveUsers(daysSince: number): Promise<IdentityUser[]>;
  getAdminUsers(): Promise<IdentityUser[]>;
  getPasswordPolicy(): Promise<PasswordPolicy>;
  getAuditLogs(start: Date, end: Date): Promise<IdentityAuditEvent[]>;
  runComplianceChecks(): Promise<ScanFinding[]>;
}
