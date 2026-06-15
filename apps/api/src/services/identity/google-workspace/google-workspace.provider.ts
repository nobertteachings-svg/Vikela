import type { ScanFinding } from "@vikela/shared";
import type {
  IIdentityProvider,
  IdentityAuditEvent,
  IdentityGroup,
  IdentityUser,
  MFAEnrollment,
  PasswordPolicy,
} from "../provider.interface.js";
import type { IdentityCredentials } from "../types.js";
import { demoIdentityFindings } from "../demo-findings.js";
import { isDemoIdentityToken } from "../types.js";

type DirectoryUser = {
  id: string;
  primaryEmail?: string;
  isEnrolledIn2Sv?: boolean;
  isAdmin?: boolean;
  lastLoginTime?: string;
  suspended?: boolean;
};

export class GoogleWorkspaceProvider implements IIdentityProvider {
  constructor(private readonly credentials: IdentityCredentials) {}

  private async googleFetch<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google API error: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async listUsers(): Promise<IdentityUser[]> {
    const customer = this.credentials.customerId ?? "my_customer";
    const data = await this.googleFetch<{ users?: DirectoryUser[] }>(
      `https://admin.googleapis.com/admin/directory/v1/users?customer=${customer}&maxResults=200&orderBy=email`
    );
    return (data.users ?? [])
      .filter((u) => !u.suspended)
      .map((u) => ({
        id: u.id,
        email: u.primaryEmail ?? u.id,
        mfaEnabled: Boolean(u.isEnrolledIn2Sv),
        lastLogin: u.lastLoginTime,
      }));
  }

  async listGroups(): Promise<IdentityGroup[]> {
    const customer = this.credentials.customerId ?? "my_customer";
    const data = await this.googleFetch<{
      groups?: { id: string; name: string; directMembersCount?: string }[];
    }>(
      `https://admin.googleapis.com/admin/directory/v1/groups?customer=${customer}&maxResults=100`
    );
    return (data.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: Number(g.directMembersCount ?? 0),
    }));
  }

  async getMFAEnrollment(): Promise<MFAEnrollment[]> {
    const users = await this.listUsers();
    return users.map((u) => ({
      userId: u.id,
      factorType: "2sv",
      enrolled: u.mfaEnabled,
    }));
  }

  async getInactiveUsers(daysSince: number): Promise<IdentityUser[]> {
    const cutoff = Date.now() - daysSince * 24 * 60 * 60 * 1000;
    const users = await this.listUsers();
    return users.filter((u) => {
      if (!u.lastLogin) return true;
      return new Date(u.lastLogin).getTime() < cutoff;
    });
  }

  async getAdminUsers(): Promise<IdentityUser[]> {
    const customer = this.credentials.customerId ?? "my_customer";
    const data = await this.googleFetch<{ users?: DirectoryUser[] }>(
      `https://admin.googleapis.com/admin/directory/v1/users?customer=${customer}&query=isAdmin=true&maxResults=50`
    );
    return (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.primaryEmail ?? u.id,
      mfaEnabled: Boolean(u.isEnrolledIn2Sv),
      lastLogin: u.lastLoginTime,
    }));
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return { minLength: 10, requireMfa: false, maxAgeDays: 90 };
  }

  async getAuditLogs(start: Date, end: Date): Promise<IdentityAuditEvent[]> {
    try {
      const startTime = start.toISOString();
      const endTime = end.toISOString();
      const data = await this.googleFetch<{
        items?: { id: string; actor?: { email?: string }; events?: { name?: string; type?: string }[] }[];
      }>(
        `https://admin.googleapis.com/admin/reports/v1/activity/users/all/applications/login?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&maxResults=50`
      );
      return (data.items ?? []).map((item) => ({
        action: item.events?.[0]?.name ?? item.events?.[0]?.type ?? "login",
        actor: item.actor?.email ?? "unknown",
        timestamp: startTime,
      }));
    } catch {
      return [];
    }
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) {
      return demoIdentityFindings("Google Workspace");
    }

    const findings: ScanFinding[] = [];
    const users = await this.listUsers();
    const withoutMfa = users.filter((u) => !u.mfaEnabled);

    if (withoutMfa.length > 0) {
      findings.push({
        title: `${withoutMfa.length} Google Workspace user(s) without 2-Step Verification`,
        description: "Directory users have isEnrolledIn2Sv=false.",
        severity: withoutMfa.length > 5 ? "HIGH" : "MEDIUM",
        source: "IAM",
        resourceType: "GoogleUser",
        resourceId: withoutMfa.map((u) => u.id).slice(0, 10).join(","),
        remediation:
          "Enforce 2-Step Verification in Admin console > Security > Authentication.",
        controlCode: "CC6.1",
      });
    }

    const admins = await this.getAdminUsers();
    const adminsNoMfa = admins.filter((a) => !a.mfaEnabled);
    if (adminsNoMfa.length > 0) {
      findings.push({
        title: `${adminsNoMfa.length} admin user(s) without 2SV`,
        description: "Super admin accounts must always use 2-Step Verification.",
        severity: "CRITICAL",
        source: "IAM",
        resourceType: "GoogleAdmin",
        resourceId: adminsNoMfa.map((a) => a.email).join(","),
        remediation: "Require 2SV for all admin roles immediately.",
        controlCode: "CC6.1",
      });
    }

    const inactive = await this.getInactiveUsers(90);
    if (inactive.length > 0) {
      findings.push({
        title: `${inactive.length} Workspace user(s) inactive >90 days`,
        description: "Users have not logged in recently.",
        severity: "MEDIUM",
        source: "IAM",
        resourceType: "GoogleUser",
        resourceId: "inactive",
        remediation: "Suspend or archive dormant accounts via Admin SDK or GAM.",
        controlCode: "CC6.2",
      });
    }

    const logs = await this.getAuditLogs(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    );
    if (logs.length === 0) {
      findings.push({
        title: "No Google login audit activity (7 days)",
        description: "Admin Reports API returned no login events.",
        severity: "LOW",
        source: "LOGGING",
        resourceType: "AdminAudit",
        resourceId: "login",
        remediation: "Verify admin.reports.audit.readonly scope and audit log retention.",
        controlCode: "CC7.1",
      });
    }

    return findings;
  }
}

export function isGoogleWorkspaceConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WORKSPACE_CLIENT_ID && process.env.GOOGLE_WORKSPACE_CLIENT_SECRET
  );
}
