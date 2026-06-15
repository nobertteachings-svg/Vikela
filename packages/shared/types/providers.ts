export type IntegrationProviderId =
  | "GITHUB"
  | "GITLAB"
  | "BITBUCKET"
  | "AWS"
  | "AZURE"
  | "GCP"
  | "DIGITALOCEAN"
  | "CLOUDFLARE"
  | "ORACLE"
  | "ALIBABA"
  | "OKTA"
  | "AZURE_AD"
  | "GOOGLE_WORKSPACE"
  | "AUTH0"
  | "JUMPCLOUD"
  | "DATADOG"
  | "GRAFANA"
  | "PAGERDUTY"
  | "NEW_RELIC"
  | "SLACK"
  | "MICROSOFT_TEAMS";

export type IntegrationCategoryId =
  | "GIT"
  | "CLOUD"
  | "IDENTITY"
  | "OBSERVABILITY"
  | "COMMUNICATION";

export interface ProviderDefinition {
  id: IntegrationProviderId;
  name: string;
  category: IntegrationCategoryId;
  brandColor: string;
  description: string;
  connectType: "oauth" | "role_arn" | "api_key" | "app_install";
  docsPath?: string;
}

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  { id: "GITHUB", name: "GitHub", category: "GIT", brandColor: "#24292e", description: "Scan repos, PRs, branch protection", connectType: "app_install" },
  { id: "GITLAB", name: "GitLab", category: "GIT", brandColor: "#fc6d26", description: "Projects, merge requests, system hooks", connectType: "oauth" },
  { id: "BITBUCKET", name: "Bitbucket", category: "GIT", brandColor: "#0052cc", description: "Workspaces, pull requests, webhooks", connectType: "oauth" },
  { id: "AWS", name: "AWS", category: "CLOUD", brandColor: "#ff9900", description: "IAM, CloudTrail, S3, GuardDuty via AssumeRole", connectType: "role_arn" },
  { id: "AZURE", name: "Azure", category: "CLOUD", brandColor: "#0078d4", description: "AAD, RBAC, Monitor, Defender", connectType: "oauth" },
  { id: "GCP", name: "Google Cloud", category: "CLOUD", brandColor: "#4285f4", description: "IAM, audit logs, Security Command Center", connectType: "oauth" },
  { id: "DIGITALOCEAN", name: "DigitalOcean", category: "CLOUD", brandColor: "#0080ff", description: "Spaces, firewalls, databases", connectType: "oauth" },
  { id: "CLOUDFLARE", name: "Cloudflare", category: "CLOUD", brandColor: "#f38020", description: "Access, WAF, Zero Trust, SSL", connectType: "oauth" },
  { id: "ORACLE", name: "Oracle Cloud", category: "CLOUD", brandColor: "#c74634", description: "IAM, audit, object storage", connectType: "oauth" },
  { id: "ALIBABA", name: "Alibaba Cloud", category: "CLOUD", brandColor: "#ff6a00", description: "RAM, ActionTrail, OSS", connectType: "oauth" },
  { id: "OKTA", name: "Okta", category: "IDENTITY", brandColor: "#007dc1", description: "MFA, users, groups, audit logs", connectType: "oauth" },
  { id: "AZURE_AD", name: "Azure AD", category: "IDENTITY", brandColor: "#0078d4", description: "Conditional access, sign-in logs", connectType: "oauth" },
  { id: "GOOGLE_WORKSPACE", name: "Google Workspace", category: "IDENTITY", brandColor: "#4285f4", description: "Directory, MFA, admin audit", connectType: "oauth" },
  { id: "AUTH0", name: "Auth0", category: "IDENTITY", brandColor: "#eb5424", description: "Users, roles, attack protection", connectType: "oauth" },
  { id: "JUMPCLOUD", name: "JumpCloud", category: "IDENTITY", brandColor: "#222222", description: "Directory, MFA, system users", connectType: "api_key" },
  { id: "DATADOG", name: "Datadog", category: "OBSERVABILITY", brandColor: "#632ca6", description: "Monitors, logs, security signals", connectType: "api_key" },
  { id: "GRAFANA", name: "Grafana", category: "OBSERVABILITY", brandColor: "#f46800", description: "Dashboards, alerts", connectType: "api_key" },
  { id: "PAGERDUTY", name: "PagerDuty", category: "OBSERVABILITY", brandColor: "#06ac38", description: "Incidents, on-call", connectType: "oauth" },
  { id: "NEW_RELIC", name: "New Relic", category: "OBSERVABILITY", brandColor: "#008c99", description: "APM, alerts", connectType: "api_key" },
  { id: "SLACK", name: "Slack", category: "COMMUNICATION", brandColor: "#4a154b", description: "Gap notifications, alerts", connectType: "oauth" },
  { id: "MICROSOFT_TEAMS", name: "Microsoft Teams", category: "COMMUNICATION", brandColor: "#6264a7", description: "Compliance alerts in Teams", connectType: "oauth" },
];

export const PROVIDERS_BY_CATEGORY = {
  GIT: PROVIDER_DEFINITIONS.filter((p) => p.category === "GIT"),
  CLOUD: PROVIDER_DEFINITIONS.filter((p) => p.category === "CLOUD"),
  IDENTITY: PROVIDER_DEFINITIONS.filter((p) => p.category === "IDENTITY"),
  OBSERVABILITY: PROVIDER_DEFINITIONS.filter((p) => p.category === "OBSERVABILITY"),
  COMMUNICATION: PROVIDER_DEFINITIONS.filter((p) => p.category === "COMMUNICATION"),
} as const;

export interface IntegrationStatus {
  provider: IntegrationProviderId;
  connected: boolean;
  integrationId?: string;
  name?: string;
  externalId?: string;
  resourceCount?: number;
  lastSyncedAt?: string;
}
