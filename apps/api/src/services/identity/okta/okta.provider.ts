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

type OktaUser = {
  id: string;
  status: string;
  profile: { email?: string; login?: string };
  lastLogin?: string;
};

type OktaFactor = { id: string; factorType: string; status: string };

export class OktaProvider implements IIdentityProvider {
  private readonly baseUrl: string;

  constructor(private readonly credentials: IdentityCredentials) {
    if (!credentials.domain) {
      throw new Error("Okta integration requires domain in metadata");
    }
    const domain = credentials.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.baseUrl = `https://${domain}`;
  }

  private authHeader(): string {
    const t = this.credentials.accessToken;
    if (t.includes(".") || t.length > 80) {
      return `Bearer ${t}`;
    }
    return `SSWS ${t}`;
  }

  private async oktaFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: this.authHeader(),
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Okta API ${path}: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async listUsers(): Promise<IdentityUser[]> {
    const users = await this.oktaFetch<OktaUser[]>("/api/v1/users?limit=200");
    return users
      .filter((u) => u.status === "ACTIVE")
      .map((u) => ({
        id: u.id,
        email: u.profile.email ?? u.profile.login ?? u.id,
        mfaEnabled: false,
        lastLogin: u.lastLogin,
      }));
  }

  async listGroups(): Promise<IdentityGroup[]> {
    const groups = await this.oktaFetch<{ id: string; profile: { name: string } }[]>(
      "/api/v1/groups?limit=100"
    );
    return groups.map((g) => ({
      id: g.id,
      name: g.profile.name,
      memberCount: 0,
    }));
  }

  async getMFAEnrollment(): Promise<MFAEnrollment[]> {
    const users = await this.listUsers();
    const enrollments: MFAEnrollment[] = [];
    for (const user of users.slice(0, 50)) {
      try {
        const factors = await this.oktaFetch<OktaFactor[]>(`/api/v1/users/${user.id}/factors`);
        const active = factors.filter((f) => f.status === "ACTIVE");
        enrollments.push({
          userId: user.id,
          factorType: active[0]?.factorType ?? "none",
          enrolled: active.length > 0,
        });
      } catch {
        enrollments.push({ userId: user.id, factorType: "unknown", enrolled: false });
      }
    }
    return enrollments;
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
    return [];
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    try {
      const policies = await this.oktaFetch<{ id: string; settings: { password?: { minLength?: number } } }[]>(
        "/api/v1/policies?type=PASSWORD"
      );
      const p = policies[0];
      return {
        minLength: p?.settings?.password?.minLength ?? 8,
        requireMfa: false,
        maxAgeDays: 90,
      };
    } catch {
      return { minLength: 8, requireMfa: false, maxAgeDays: 90 };
    }
  }

  async getAuditLogs(start: Date, end: Date): Promise<IdentityAuditEvent[]> {
    try {
      const since = start.toISOString();
      const until = end.toISOString();
      const logs = await this.oktaFetch<{ published: string; actor: { displayName?: string }; displayMessage?: string; eventType?: string }[]>(
        `/api/v1/logs?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=50`
      );
      return logs.map((l) => ({
        action: l.eventType ?? l.displayMessage ?? "event",
        actor: l.actor?.displayName ?? "system",
        timestamp: l.published,
      }));
    } catch {
      return [];
    }
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) {
      return demoIdentityFindings("Okta");
    }

    const findings: ScanFinding[] = [];
    const mfa = await this.getMFAEnrollment();
    const withoutMfa = mfa.filter((e) => !e.enrolled);
    if (withoutMfa.length > 0) {
      findings.push({
        title: `${withoutMfa.length} Okta user(s) without MFA`,
        description: `${withoutMfa.length} active users have no enrolled MFA factors.`,
        severity: withoutMfa.length > 5 ? "HIGH" : "MEDIUM",
        source: "IAM",
        resourceType: "OktaUser",
        resourceId: withoutMfa.map((u) => u.userId).slice(0, 10).join(","),
        remediation:
          "Enable Okta MFA enrollment policy. Require factors at next sign-on for all users.",
        controlCode: "CC6.1",
      });
    }

    const inactive = await this.getInactiveUsers(90);
    if (inactive.length > 0) {
      findings.push({
        title: `${inactive.length} inactive Okta user(s) (>90 days)`,
        description: "Users remain ACTIVE but have not signed in for over 90 days.",
        severity: "MEDIUM",
        source: "IAM",
        resourceType: "OktaUser",
        resourceId: "inactive",
        remediation: "Deactivate dormant accounts or run automated access reviews.",
        controlCode: "CC6.2",
      });
    }

    const policy = await this.getPasswordPolicy();
    if (!policy.requireMfa) {
      findings.push({
        title: "Okta sign-on policy does not require MFA",
        description: "Password / authentication policy does not mandate MFA for all users.",
        severity: "HIGH",
        source: "IAM",
        resourceType: "OktaPolicy",
        resourceId: "sign-on",
        remediation: "Create an Okta sign-on policy that requires MFA for every application.",
        controlCode: "CC6.1",
      });
    }

    const logs = await this.getAuditLogs(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    );
    if (logs.length === 0) {
      findings.push({
        title: "No Okta system log events in the last 7 days",
        description: "Unable to retrieve audit logs — verify okta.logs.read scope or log retention.",
        severity: "LOW",
        source: "LOGGING",
        resourceType: "OktaLog",
        resourceId: "system-log",
        remediation: "Ensure System Log API access and retention meet SOC 2 CC7.1 requirements.",
        controlCode: "CC7.1",
      });
    }

    return findings;
  }
}

export function isOktaConfigured(): boolean {
  return Boolean(process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET);
}
