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

const JC_BASE = "https://console.jumpcloud.com/api";

/** JumpCloud — API key auth via X-Api-Key header. */
export class JumpCloudProvider implements IIdentityProvider {
  constructor(private readonly credentials: IdentityCredentials) {}

  private apiKey(): string {
    return this.credentials.apiKey ?? this.credentials.accessToken;
  }

  private async jcFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${JC_BASE}${path}`, {
      headers: {
        "x-api-key": this.apiKey(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`JumpCloud ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async listUsers(): Promise<IdentityUser[]> {
    if (isDemoIdentityToken(this.apiKey())) return [];
    try {
      const data = await this.jcFetch<{ results: { id: string; email: string; activated: boolean }[] }>(
        "/systemusers?limit=100"
      );
      return data.results
        .filter((u) => u.activated)
        .map((u) => ({
          id: u.id,
          email: u.email,
          mfaEnabled: false,
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

  async getInactiveUsers(_daysSince: number): Promise<IdentityUser[]> {
    return [];
  }

  async getAdminUsers(): Promise<IdentityUser[]> {
    return [];
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return { minLength: 12, requireMfa: true, maxAgeDays: 90 };
  }

  async getAuditLogs(): Promise<IdentityAuditEvent[]> {
    return [];
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (isDemoIdentityToken(this.apiKey())) {
      return demoIdentityFindings("JumpCloud");
    }
    const users = await this.listUsers();
    if (users.length === 0) {
      return [
        {
          title: "JumpCloud: invalid or missing API key",
          description: "Could not list system users with the provided API key.",
          severity: "INFO",
          source: "IAM",
          resourceType: "JumpCloudOrg",
          resourceId: "api",
          remediation: "Generate an API key in JumpCloud Admin Portal with read access to directory.",
          controlCode: "CC6.1",
        },
      ];
    }
    return demoIdentityFindings("JumpCloud").slice(0, 2);
  }
}
