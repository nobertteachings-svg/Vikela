import type { IntegrationProvider } from "@prisma/client";
import type { IIdentityProvider } from "./provider.interface.js";
import type { IdentityCredentials } from "./types.js";
import { OktaProvider } from "./okta/okta.provider.js";
import { AzureAdProvider } from "./azure-ad/azure-ad.provider.js";
import { GoogleWorkspaceProvider } from "./google-workspace/google-workspace.provider.js";
import { Auth0Provider } from "./auth0/auth0.provider.js";
import { JumpCloudProvider } from "./jumpcloud/jumpcloud.provider.js";
import { demoIdentityFindings } from "./demo-findings.js";

class StubIdentityProvider implements IIdentityProvider {
  constructor(private readonly label: string) {}

  async listUsers() {
    return [];
  }
  async listGroups() {
    return [];
  }
  async getMFAEnrollment() {
    return [];
  }
  async getInactiveUsers() {
    return [];
  }
  async getAdminUsers() {
    return [];
  }
  async getPasswordPolicy() {
    return { minLength: 12, requireMfa: true, maxAgeDays: 90 };
  }
  async getAuditLogs() {
    return [];
  }
  async runComplianceChecks() {
    return demoIdentityFindings(this.label);
  }
}

export function getIdentityProvider(
  provider: IntegrationProvider,
  credentials: IdentityCredentials
): IIdentityProvider {
  switch (provider) {
    case "OKTA":
      return new OktaProvider(credentials);
    case "AZURE_AD":
      return new AzureAdProvider(credentials);
    case "GOOGLE_WORKSPACE":
      return new GoogleWorkspaceProvider(credentials);
    case "AUTH0":
      return new Auth0Provider(credentials);
    case "JUMPCLOUD":
      return new JumpCloudProvider(credentials);
    default:
      return new StubIdentityProvider(provider);
  }
}
