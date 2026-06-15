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

/** Auth0 Management API — minimal implementation; extend with tenant domain + M2M token. */
export class Auth0Provider implements IIdentityProvider {
  constructor(private readonly credentials: IdentityCredentials) {}

  async listUsers(): Promise<IdentityUser[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) return [];
    const domain = this.credentials.auth0Domain;
    if (!domain) return [];
    try {
      const res = await fetch(`https://${domain}/api/v2/users?per_page=50`, {
        headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
      });
      if (!res.ok) return [];
      const users = (await res.json()) as { user_id: string; email?: string; last_login?: string }[];
      return users.map((u) => ({
        id: u.user_id,
        email: u.email ?? u.user_id,
        mfaEnabled: false,
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
    return [];
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
    const users = await this.listUsers();
    if (users.length === 0) {
      return [
        {
          title: "Auth0: configure Management API credentials",
          description:
            "Connect Auth0 with a Machine-to-Machine app (read:users) to enable live identity scans.",
          severity: "INFO",
          source: "IAM",
          resourceType: "Auth0Tenant",
          resourceId: this.credentials.auth0Domain ?? "unknown",
          remediation: "Set AUTH0_MANAGEMENT_CLIENT_ID/SECRET and tenant domain in integration metadata.",
          controlCode: "CC6.1",
        },
      ];
    }
    return demoIdentityFindings("Auth0").slice(0, 1);
  }
}
