"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody } from "@/components/comply/card";
import { useOrgRole } from "@/hooks/use-org-role";
import { apiDelete, apiPost } from "@/lib/api";
import type { IntegrationsResponse } from "@/lib/compliance-api";
import {
  azureAdStartUrl,
  azureCloudStartUrl,
  bitbucketStartUrl,
  gcpCloudStartUrl,
  githubInstallUrl,
  githubManageInstallationsUrl,
  gitlabStartUrl,
  googleWorkspaceStartUrl,
  slackStartUrl,
} from "@/lib/integration-oauth";
import { ConnectAuth0Dialog } from "./ConnectAuth0Dialog";
import { ConnectAwsDialog } from "./ConnectAwsDialog";
import { ConnectCloudflareDialog } from "./ConnectCloudflareDialog";
import { ConnectDatadogDialog } from "./ConnectDatadogDialog";
import { ConnectGrafanaDialog } from "./ConnectGrafanaDialog";
import { ConnectJumpCloudDialog } from "./ConnectJumpCloudDialog";
import { ConnectOktaDialog } from "./ConnectOktaDialog";
import { ConnectNewRelicDialog } from "./ConnectNewRelicDialog";
import { ConnectPagerDutyDialog } from "./ConnectPagerDutyDialog";
import { ConnectMicrosoftTeamsDialog } from "./ConnectMicrosoftTeamsDialog";
import { IntegrationConnectLink } from "./integration-connect-link";

type ProviderRow = IntegrationsResponse["providers"][number];

type DialogKind =
  | "aws"
  | "okta"
  | "jumpcloud"
  | "auth0"
  | "cloudflare"
  | "datadog"
  | "grafana"
  | "pagerduty"
  | "newrelic"
  | "teams"
  | null;

const GIT_PROVIDERS = new Set(["GITHUB", "GITLAB", "BITBUCKET"]);

/** Observability + communication: credentials/alerts only, not scan sources. */
const ALERT_CREDENTIAL_PROVIDERS = new Set([
  "DATADOG",
  "GRAFANA",
  "PAGERDUTY",
  "NEW_RELIC",
  "SLACK",
  "MICROSOFT_TEAMS",
]);

function isAlertCredentialProvider(int: ProviderRow): boolean {
  if (ALERT_CREDENTIAL_PROVIDERS.has(int.id)) return true;
  const cat = (int.category ?? "").toUpperCase();
  return cat === "OBSERVABILITY" || cat === "COMMUNICATION";
}

function oauthHref(providerId: string, orgSlug: string | null): string | null {
  if (providerId === "GITHUB") return githubInstallUrl(orgSlug);
  if (providerId === "GITLAB") return gitlabStartUrl(orgSlug);
  if (providerId === "BITBUCKET") return bitbucketStartUrl(orgSlug);
  if (providerId === "AZURE") return azureCloudStartUrl(orgSlug);
  if (providerId === "GCP") return gcpCloudStartUrl(orgSlug);
  if (providerId === "AZURE_AD") return azureAdStartUrl(orgSlug);
  if (providerId === "GOOGLE_WORKSPACE") return googleWorkspaceStartUrl(orgSlug);
  if (providerId === "SLACK") return slackStartUrl(orgSlug);
  return null;
}

function dialogForProvider(providerId: string): DialogKind {
  if (providerId === "AWS") return "aws";
  if (providerId === "OKTA") return "okta";
  if (providerId === "JUMPCLOUD") return "jumpcloud";
  if (providerId === "AUTH0") return "auth0";
  if (providerId === "CLOUDFLARE") return "cloudflare";
  if (providerId === "DATADOG") return "datadog";
  if (providerId === "GRAFANA") return "grafana";
  if (providerId === "PAGERDUTY") return "pagerduty";
  if (providerId === "NEW_RELIC") return "newrelic";
  if (providerId === "MICROSOFT_TEAMS") return "teams";
  return null;
}

function resourceLabel(int: ProviderRow): string {
  if (!int.connected) {
    if (int.unavailableReason === "coming_soon") return "Coming soon";
    if (int.unavailableReason === "not_configured") return "Not configured";
    return "Available";
  }
  const n = int.resourceCount ?? 0;
  if (int.category === "GIT") {
    return `${n} ${n === 1 ? "repo" : "repos"}`;
  }
  if (int.category === "CLOUD") {
    return `${n} ${n === 1 ? "account" : "accounts"}`;
  }
  if (int.category === "IDENTITY") {
    return "Connected";
  }
  if (isAlertCredentialProvider(int)) {
    return "Connected";
  }
  return `${n} resources`;
}

export function IntegrationsProviderGrid({
  providers,
  orgSlug,
}: {
  providers: ProviderRow[];
  orgSlug: string | null;
}) {
  const router = useRouter();
  const { appRole, isAuditor, isLoaded } = useOrgRole();
  const [openDialog, setOpenDialog] = useState<DialogKind>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canManage = isLoaded && !isAuditor && appRole === "admin";

  function onConnectSuccess() {
    router.refresh();
  }

  async function disconnect(integrationId: string, providerName: string) {
    const ok = window.confirm(
      `Disconnect ${providerName} in Vikela?\n\n` +
        "This revokes stored credentials in Vikela and deactivates linked repos/accounts. " +
        "It does not remove the GitHub App, OAuth grant, IAM role, or API key in your provider, " +
        "revoke those separately if needed."
    );
    if (!ok) return;

    setDisconnectingId(integrationId);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/integrations/${integrationId}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnectingId(null);
    }
  }

  async function syncRepos(integrationId: string) {
    setSyncingId(integrationId);
    setMessage(null);
    try {
      const result = await apiPost<{ synced: number }>(
        `/api/v1/integrations/${integrationId}/sync-repos`,
        {}
      );
      setMessage(`Synced ${result.synced} ${result.synced === 1 ? "repository" : "repositories"}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  function renderAction(int: ProviderRow) {
    if (int.connected) {
      if (!canManage) {
        return <span className="text-xs text-comply-text-secondary">Active</span>;
      }

      const href = oauthHref(int.id, orgSlug);
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {GIT_PROVIDERS.has(int.id) && int.integrationId ? (
            <button
              type="button"
              disabled={syncingId === int.integrationId}
              onClick={() => void syncRepos(int.integrationId!)}
              className="text-xs font-medium text-comply-green-border hover:underline disabled:opacity-50"
            >
              {syncingId === int.integrationId ? "Syncing…" : "Sync repos"}
            </button>
          ) : null}
          {int.id === "GITHUB" ? (
            <a
              href={githubManageInstallationsUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-comply-text-secondary hover:text-comply-text-primary"
            >
              Manage
            </a>
          ) : null}
          {href ? (
            <IntegrationConnectLink href={href} className="text-xs font-medium text-comply-text-secondary hover:text-comply-text-primary" adminOnly>
              Reconnect
            </IntegrationConnectLink>
          ) : null}
          {int.integrationId ? (
            <button
              type="button"
              disabled={disconnectingId === int.integrationId}
              onClick={() => void disconnect(int.integrationId!, int.name)}
              className="text-xs font-medium text-comply-text-tertiary hover:text-comply-red disabled:opacity-50"
            >
              {disconnectingId === int.integrationId ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : null}
        </div>
      );
    }

    if (int.connectable === false) {
      return (
        <span className="text-xs text-comply-text-secondary">
          {int.unavailableReason === "not_configured" ? "Not configured" : "Coming soon"}
        </span>
      );
    }

    if (!canManage) {
      return (
        <span className="text-xs text-comply-text-tertiary">
          {isAuditor ? "View only" : "Admin required"}
        </span>
      );
    }

    const href = oauthHref(int.id, orgSlug);
    if (href) {
      return (
        <IntegrationConnectLink href={href} className="comply-link text-xs font-medium" adminOnly>
          Connect
        </IntegrationConnectLink>
      );
    }

    const dialog = dialogForProvider(int.id);
    if (dialog) {
      return (
        <button
          type="button"
          onClick={() => setOpenDialog(dialog)}
          className="comply-link text-xs font-medium"
        >
          Connect
        </button>
      );
    }

    return <span className="text-xs text-comply-text-secondary">Coming soon</span>;
  }

  return (
    <>
      {message ? (
        <p className="mb-4 rounded-lg bg-white/[0.04] px-4 py-2 text-sm text-comply-text-secondary">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((int) => (
          <Card
            key={int.id}
            className="transition-all hover:-translate-y-0.5 hover:border-comply-green-border/30"
          >
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-comply-text-primary">{int.name}</h3>
                {int.connected && (
                  <span className="comply-badge border-comply-green/30 bg-comply-green/10 text-comply-green normal-case text-[10px]">
                    {isAlertCredentialProvider(int) ? "Connected" : "Live"}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                {int.description}
              </p>
              {int.connected && isAlertCredentialProvider(int) ? (
                <p className="mt-2 text-[11px] text-comply-text-tertiary">
                  Alerts and credentials are stored here. Scans come from git, cloud, and identity
                  integrations.
                </p>
              ) : null}
              {int.id === "AWS" && int.connectable && int.awsPlatformReady === false ? (
                <p className="mt-2 text-[11px] text-comply-amber-text">
                  Platform AWS STS is not configured, connect will fail until Vikela AWS keys are set.
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <span className="text-xs text-comply-text-tertiary">{resourceLabel(int)}</span>
                {renderAction(int)}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {openDialog === "aws" && (
        <ConnectAwsDialog onClose={() => setOpenDialog(null)} onSuccess={onConnectSuccess} />
      )}
      {openDialog === "okta" && (
        <ConnectOktaDialog orgSlug={orgSlug} onClose={() => setOpenDialog(null)} />
      )}
      {openDialog === "jumpcloud" && (
        <ConnectJumpCloudDialog
          onClose={() => setOpenDialog(null)}
          onSuccess={onConnectSuccess}
        />
      )}
      {openDialog === "auth0" && (
        <ConnectAuth0Dialog onClose={() => setOpenDialog(null)} onSuccess={onConnectSuccess} />
      )}
      {openDialog === "cloudflare" && (
        <ConnectCloudflareDialog
          onClose={() => setOpenDialog(null)}
          onSuccess={onConnectSuccess}
        />
      )}
      {openDialog === "datadog" && (
        <ConnectDatadogDialog onClose={() => setOpenDialog(null)} onSuccess={onConnectSuccess} />
      )}
      {openDialog === "grafana" && (
        <ConnectGrafanaDialog onClose={() => setOpenDialog(null)} onSuccess={onConnectSuccess} />
      )}
      {openDialog === "pagerduty" && (
        <ConnectPagerDutyDialog
          onClose={() => setOpenDialog(null)}
          onSuccess={onConnectSuccess}
        />
      )}
      {openDialog === "newrelic" && (
        <ConnectNewRelicDialog onClose={() => setOpenDialog(null)} onSuccess={onConnectSuccess} />
      )}
      {openDialog === "teams" && (
        <ConnectMicrosoftTeamsDialog
          onClose={() => setOpenDialog(null)}
          onSuccess={onConnectSuccess}
        />
      )}
    </>
  );
}
