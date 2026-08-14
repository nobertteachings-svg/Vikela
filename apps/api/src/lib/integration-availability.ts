import { isGitHubAppConfigured, isGitHubOAuthConfigured } from "./github-app.js";
import { isShieldoqAwsConfigured } from "./aws-session.js";
import type { IntegrationProviderId } from "@vikela/shared";

export type ConnectAvailability = {
  connectable: boolean;
  /** Why Connect is unavailable when connectable is false */
  reason?: "coming_soon" | "not_configured";
};

/** Providers with a real connect path in product (OAuth, App, dialog, or API key). */
const IMPLEMENTED = new Set<IntegrationProviderId>([
  "GITHUB",
  "GITLAB",
  "BITBUCKET",
  "AWS",
  "AZURE",
  "GCP",
  "CLOUDFLARE",
  "OKTA",
  "AZURE_AD",
  "GOOGLE_WORKSPACE",
  "JUMPCLOUD",
  "AUTH0",
  "DATADOG",
  "GRAFANA",
  "PAGERDUTY",
  "NEW_RELIC",
  "SLACK",
  "MICROSOFT_TEAMS",
]);

export function getProviderConnectAvailability(
  providerId: IntegrationProviderId
): ConnectAvailability {
  if (!IMPLEMENTED.has(providerId)) {
    return { connectable: false, reason: "coming_soon" };
  }

  switch (providerId) {
    case "GITHUB":
      return isGitHubAppConfigured() || isGitHubOAuthConfigured()
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "GITLAB":
      return process.env.GITLAB_APP_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "BITBUCKET":
      return process.env.BITBUCKET_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "AWS":
      // Dialog always shown; connect fails honestly if Shieldoq AWS STS is missing (unless demo).
      return { connectable: true };
    case "AZURE":
      return process.env.AZURE_CLIENT_ID || process.env.AZURE_CLOUD_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "GCP":
      return process.env.GCP_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "CLOUDFLARE":
      // Customer supplies API token, no Shieldoq-side Cloudflare app secrets required.
      return { connectable: true };
    case "OKTA":
      return process.env.OKTA_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "AZURE_AD":
      return process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "GOOGLE_WORKSPACE":
      return process.env.GOOGLE_WORKSPACE_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "JUMPCLOUD":
      return { connectable: true };
    case "AUTH0":
      return process.env.AUTH0_MANAGEMENT_CLIENT_ID || process.env.AUTH0_CLIENT_ID
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "DATADOG":
      // Customer supplies API + Application keys, no Shieldoq-side Datadog secrets required.
      return { connectable: true };
    case "GRAFANA":
      // Customer supplies base URL + service account token, no Shieldoq-side Grafana secrets required.
      return { connectable: true };
    case "PAGERDUTY":
      // Customer supplies REST API token, no Shieldoq-side PagerDuty OAuth app required.
      return { connectable: true };
    case "NEW_RELIC":
      // Customer supplies User API key (+ optional account id / region), no platform NR secrets.
      return { connectable: true };
    case "SLACK":
      return process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
        ? { connectable: true }
        : { connectable: false, reason: "not_configured" };
    case "MICROSOFT_TEAMS":
      // Customer supplies Incoming Webhook URL, no Shieldoq-side Teams OAuth app required.
      return { connectable: true };
    default:
      return { connectable: false, reason: "coming_soon" };
  }
}

export function awsPlatformReady(): boolean {
  return isShieldoqAwsConfigured();
}
