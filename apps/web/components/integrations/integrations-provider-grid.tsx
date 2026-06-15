"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody } from "@/components/comply/card";
import { useOrgRole } from "@/hooks/use-org-role";
import { apiDelete } from "@/lib/api";
import type { IntegrationsResponse } from "@/lib/compliance-api";
import {
  azureAdStartUrl,
  azureCloudStartUrl,
  bitbucketStartUrl,
  gcpCloudStartUrl,
  githubInstallUrl,
  gitlabStartUrl,
  googleWorkspaceStartUrl,
} from "@/lib/integration-oauth";
import { ConnectAwsDialog } from "./ConnectAwsDialog";
import { ConnectJumpCloudDialog } from "./ConnectJumpCloudDialog";
import { ConnectOktaDialog } from "./ConnectOktaDialog";
import { IntegrationConnectLink } from "./integration-connect-link";

type ProviderRow = IntegrationsResponse["providers"][number];

type DialogKind = "aws" | "okta" | "jumpcloud" | null;

function oauthHref(providerId: string, orgSlug: string | null): string | null {
  if (providerId === "GITHUB") return githubInstallUrl(orgSlug);
  if (providerId === "GITLAB") return gitlabStartUrl(orgSlug);
  if (providerId === "BITBUCKET") return bitbucketStartUrl(orgSlug);
  if (providerId === "AZURE") return azureCloudStartUrl(orgSlug);
  if (providerId === "GCP") return gcpCloudStartUrl(orgSlug);
  if (providerId === "AZURE_AD") return azureAdStartUrl(orgSlug);
  if (providerId === "GOOGLE_WORKSPACE") return googleWorkspaceStartUrl(orgSlug);
  return null;
}

function dialogForProvider(providerId: string): DialogKind {
  if (providerId === "AWS") return "aws";
  if (providerId === "OKTA") return "okta";
  if (providerId === "JUMPCLOUD") return "jumpcloud";
  return null;
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

  const canManage = isLoaded && !isAuditor && appRole === "admin";

  function onConnectSuccess() {
    router.refresh();
  }

  async function disconnect(integrationId: string, providerName: string) {
    const ok = window.confirm(
      `Disconnect ${providerName} in Vikela?\n\n` +
        "This marks the integration inactive in Vikela. It does not remove the GitHub App, " +
        "OAuth grant, IAM role, or API key in your provider — revoke those separately if needed."
    );
    if (!ok) return;

    setDisconnectingId(integrationId);
    try {
      await apiDelete(`/api/v1/integrations/${integrationId}`);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnectingId(null);
    }
  }

  function renderAction(int: ProviderRow) {
    if (int.connected) {
      if (canManage && int.integrationId) {
        return (
          <button
            type="button"
            disabled={disconnectingId === int.integrationId}
            onClick={() => void disconnect(int.integrationId!, int.name)}
            className="text-xs font-medium text-comply-text-tertiary hover:text-comply-red disabled:opacity-50"
          >
            {disconnectingId === int.integrationId ? "Disconnecting…" : "Disconnect"}
          </button>
        );
      }
      return <span className="text-xs text-comply-text-secondary">Active</span>;
    }

    const href = oauthHref(int.id, orgSlug);
    if (href) {
      return (
        <IntegrationConnectLink href={href} className="comply-link text-xs font-medium">
          Connect
        </IntegrationConnectLink>
      );
    }

    const dialog = dialogForProvider(int.id);
    if (dialog) {
      if (!canManage) {
        return <span className="text-xs text-comply-text-tertiary">Admin required</span>;
      }
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((int) => (
          <Card
            key={int.id}
            className="transition-all hover:-translate-y-0.5 hover:border-comply-purple-border/30"
          >
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-comply-text-primary">{int.name}</h3>
                {int.connected && (
                  <span className="comply-badge border-comply-green/30 bg-comply-green/10 text-comply-green normal-case text-[10px]">
                    Live
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                {int.description}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <span className="text-xs text-comply-text-tertiary">
                  {int.connected ? `${int.resourceCount ?? 0} resources` : "Available"}
                </span>
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
    </>
  );
}
