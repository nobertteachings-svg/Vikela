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

/** Auth0 Management API identity provider. */
export class Auth0Provider implements IIdentityProvider {
  constructor(private readonly credentials: IdentityCredentials) {}

  private domain(): string | undefined {
    return this.credentials.auth0Domain?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  async listUsers(): Promise<IdentityUser[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) return [];
    const domain = this.domain();
    if (!domain) return [];
    try {
      const res = await fetch(
        `https://${domain}/api/v2/users?per_page=100&include_totals=false`,
        { headers: { Authorization: `Bearer ${this.credentials.accessToken}` } }
      );
      if (!res.ok) return [];
      const users = (await res.json()) as {
        user_id: string;
        email?: string;
        last_login?: string;
        multifactor?: string[];
        email_verified?: boolean;
        blocked?: boolean;
      }[];
      return users.map((u) => ({
        id: u.user_id,
        email: u.email ?? u.user_id,
        mfaEnabled: Boolean(u.multifactor && u.multifactor.length > 0),
        lastLogin: u.last_login,
      }));
    } catch {
      return [];
    }
  }

  async listGroups(): Promise<IdentityGroup[]> {
    return [];
  }

  async getMFAEnrollment(): Promise<MFAEnrollment[]> {
    const users = await this.listUsers();
    return users.map((u) => ({
      userId: u.id,
      factorType: u.mfaEnabled ? "guardian" : "none",
      enrolled: Boolean(u.mfaEnabled),
    }));
  }

  async getInactiveUsers(daysSince: number): Promise<IdentityUser[]> {
    const cutoff = Date.now() - daysSince * 24 * 60 * 60 * 1000;
    const users = await this.listUsers();
    return users.filter((u) => !u.lastLogin || new Date(u.lastLogin).getTime() < cutoff);
  }

  async getAdminUsers(): Promise<IdentityUser[]> {
    return [];
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return { minLength: 8, requireMfa: false, maxAgeDays: 90 };
  }

  async getAuditLogs(): Promise<IdentityAuditEvent[]> {
    return [];
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) {
      return demoIdentityFindings("Auth0");
    }

    const domain = this.domain() ?? "unknown";
    const users = await this.listUsers();
    if (users.length === 0) {
      return [
        {
          title: "Auth0: no users returned",
          description:
            "Management API returned zero users. Confirm the M2M app has read:users and the tenant has users.",
          severity: "INFO",
          source: "IAM",
          resourceType: "Auth0Tenant",
          resourceId: domain,
          remediation: "Grant read:users on Auth0 Management API to the M2M application.",
          controlCode: "CC6.1",
        },
      ];
    }

    const findings: ScanFinding[] = [];
    const withoutMfa = users.filter((u) => !u.mfaEnabled);
    if (withoutMfa.length > 0) {
      findings.push({
        title: `${withoutMfa.length} Auth0 users without MFA`,
        description: `Sample: ${withoutMfa
          .slice(0, 5)
          .map((u) => u.email)
          .join(", ")}`,
        severity: withoutMfa.length > 10 ? "HIGH" : "MEDIUM",
        source: "IAM",
        resourceType: "Auth0User",
        resourceId: domain,
        remediation: "Enforce MFA in Auth0 Authentication → Multifactor Auth / Guardian.",
        controlCode: "CC6.1",
      });
    }

    const inactive = await this.getInactiveUsers(90);
    if (inactive.length > 0) {
      findings.push({
        title: `${inactive.length} Auth0 users inactive 90+ days`,
        description: "Stale accounts increase credential risk.",
        severity: "MEDIUM",
        source: "IAM",
        resourceType: "Auth0User",
        resourceId: domain,
        remediation: "Disable or remove unused Auth0 accounts.",
        controlCode: "CC6.2",
      });
    }

    findings.push({
      title: `Auth0 tenant connected (${users.length} users)`,
      description: `Live Management API access verified for ${domain}.`,
      severity: "INFO",
      source: "IAM",
      resourceType: "Auth0Tenant",
      resourceId: domain,
      remediation: "Continue reviewing MFA and attack protection in Auth0 dashboard.",
      controlCode: "CC6.1",
    });

    return findings;
  }
}
