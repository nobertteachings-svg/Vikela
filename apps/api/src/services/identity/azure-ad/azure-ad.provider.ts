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

type GraphUser = {
  id: string;
  userPrincipalName?: string;
  mail?: string;
  signInActivity?: { lastSignInDateTime?: string };
};

export class AzureAdProvider implements IIdentityProvider {
  private readonly tenantId: string;

  constructor(private readonly credentials: IdentityCredentials) {
    if (!credentials.tenantId) {
      throw new Error("Azure AD integration requires tenantId in metadata");
    }
    this.tenantId = credentials.tenantId;
  }

  private async graphFetch<T>(path: string): Promise<T> {
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Microsoft Graph ${path}: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async listUsers(): Promise<IdentityUser[]> {
    const data = await this.graphFetch<{ value: GraphUser[] }>(
      "/users?$select=id,userPrincipalName,mail,signInActivity&$top=200"
    );
    return data.value.map((u) => ({
      id: u.id,
      email: u.mail ?? u.userPrincipalName ?? u.id,
      mfaEnabled: false,
      lastLogin: u.signInActivity?.lastSignInDateTime,
    }));
  }

  async listGroups(): Promise<IdentityGroup[]> {
    const data = await this.graphFetch<{ value: { id: string; displayName: string }[] }>(
      "/groups?$select=id,displayName&$top=100"
    );
    return data.value.map((g) => ({
      id: g.id,
      name: g.displayName,
      memberCount: 0,
    }));
  }

  async getMFAEnrollment(): Promise<MFAEnrollment[]> {
    try {
      const data = await this.graphFetch<{
        value: { userPrincipalName: string; isMfaRegistered: boolean; methodsRegistered?: string[] }[];
      }>("/reports/authenticationMethods/userRegistrationDetails?$top=200");
      return data.value.map((r) => ({
        userId: r.userPrincipalName,
        factorType: r.methodsRegistered?.join(",") ?? "unknown",
        enrolled: r.isMfaRegistered,
      }));
    } catch {
      const users = await this.listUsers();
      return users.map((u) => ({
        userId: u.id,
        factorType: "unknown",
        enrolled: false,
      }));
    }
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
    try {
      const data = await this.graphFetch<{ value: GraphUser[] }>(
        "/directoryRoles?$expand=members($select=id,userPrincipalName,mail)"
      );
      const admins: IdentityUser[] = [];
      for (const role of data.value as { members?: GraphUser[] }[]) {
        for (const m of role.members ?? []) {
          admins.push({
            id: m.id,
            email: m.mail ?? m.userPrincipalName ?? m.id,
            mfaEnabled: false,
          });
        }
      }
      return admins;
    } catch {
      return [];
    }
  }

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    return { minLength: 12, requireMfa: false, maxAgeDays: 90 };
  }

  async getAuditLogs(start: Date, end: Date): Promise<IdentityAuditEvent[]> {
    try {
      const filter = `createdDateTime ge ${start.toISOString()} and createdDateTime le ${end.toISOString()}`;
      const data = await this.graphFetch<{
        value: { id: string; userDisplayName?: string; createdDateTime: string; appDisplayName?: string }[];
      }>(`/auditLogs/signIns?$filter=${encodeURIComponent(filter)}&$top=50`);
      return data.value.map((e) => ({
        action: e.appDisplayName ?? "signIn",
        actor: e.userDisplayName ?? "unknown",
        timestamp: e.createdDateTime,
      }));
    } catch {
      return [];
    }
  }

  async runComplianceChecks(): Promise<ScanFinding[]> {
    if (isDemoIdentityToken(this.credentials.accessToken)) {
      return demoIdentityFindings("Azure AD");
    }

    const findings: ScanFinding[] = [];

    const mfa = await this.getMFAEnrollment();
    const withoutMfa = mfa.filter((e) => !e.enrolled);
    if (withoutMfa.length > 0) {
      findings.push({
        title: `${withoutMfa.length} Entra ID user(s) without MFA registration`,
        description: "Users in authentication methods report show isMfaRegistered=false.",
        severity: withoutMfa.length > 5 ? "HIGH" : "MEDIUM",
        source: "IAM",
        resourceType: "EntraUser",
        resourceId: withoutMfa.map((u) => u.userId).slice(0, 10).join(","),
        remediation:
          "Enable Security Defaults or Conditional Access requiring MFA for all users.",
        controlCode: "CC6.1",
      });
    }

    try {
      const caPolicies = await this.graphFetch<{ value: { id: string; displayName: string; state: string }[] }>(
        "/identity/conditionalAccess/policies"
      );
      const enabled = caPolicies.value.filter((p) => p.state === "enabled");
      const hasMfaPolicy = enabled.some((p) =>
        p.displayName.toLowerCase().includes("mfa")
      );
      if (enabled.length === 0 || !hasMfaPolicy) {
        findings.push({
          title: "No Conditional Access policy enforcing MFA",
          description:
            enabled.length === 0
              ? "No enabled Conditional Access policies were found."
              : "No enabled policy name suggests MFA enforcement.",
          severity: "HIGH",
          source: "IAM",
          resourceType: "ConditionalAccessPolicy",
          resourceId: this.tenantId,
          remediation:
            "Create a Conditional Access policy requiring MFA for all users and admin roles.",
          controlCode: "CC6.1",
        });
      }
    } catch {
      findings.push({
        title: "Unable to read Conditional Access policies",
        description: "Microsoft Graph Policy.Read.All may be missing from the app grant.",
        severity: "MEDIUM",
        source: "IAM",
        resourceType: "ConditionalAccessPolicy",
        resourceId: this.tenantId,
        remediation: "Grant Policy.Read.All and re-consent the Shieldoq Azure AD application.",
        controlCode: "CC6.1",
      });
    }

    const inactive = await this.getInactiveUsers(90);
    if (inactive.length > 0) {
      findings.push({
        title: `${inactive.length} Entra ID user(s) inactive >90 days`,
        description: "Accounts have not signed in recently but remain enabled.",
        severity: "MEDIUM",
        source: "IAM",
        resourceType: "EntraUser",
        resourceId: "inactive",
        remediation: "Disable accounts via Entra lifecycle workflows or PIM reviews.",
        controlCode: "CC6.2",
      });
    }

    const signIns = await this.getAuditLogs(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    );
    if (signIns.length === 0) {
      findings.push({
        title: "No sign-in audit logs retrieved (7 days)",
        description: "AuditLog.Read.All may be missing or sign-in logs are empty.",
        severity: "LOW",
        source: "LOGGING",
        resourceType: "SignInLog",
        resourceId: this.tenantId,
        remediation: "Grant AuditLog.Read.All and verify sign-in log retention.",
        controlCode: "CC7.1",
      });
    }

    return findings;
  }
}

export function isAzureAdConfigured(): boolean {
  return Boolean(
    process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      (process.env.AZURE_TENANT_ID || process.env.AZURE_AD_TENANT_ID)
  );
}
