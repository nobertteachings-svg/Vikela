"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconAlertTriangle, IconCircleCheck, IconX } from "@tabler/icons-react";

const ERROR_LABELS: Record<string, string> = {
  github_not_configured:
    "GitHub is not configured, set a public GitHub App (GITHUB_APP_ID + PEM) or OAuth client credentials.",
  github_missing_params: "GitHub connection was interrupted, try again.",
  gitlab_not_configured: "GitLab OAuth is not configured on this server.",
  gitlab_no_code: "GitLab did not return an authorization code.",
  bitbucket_not_configured: "Bitbucket OAuth is not configured on this server.",
  bitbucket_no_code: "Bitbucket did not return an authorization code.",
  okta_domain_required: "Enter your Okta domain before continuing.",
  okta_not_configured: "Okta OAuth is not configured on this server.",
  okta_no_code: "Okta did not return an authorization code.",
  azure_ad_not_configured: "Azure AD OAuth is not configured on this server.",
  azure_ad_no_code: "Azure AD did not return an authorization code.",
  google_workspace_not_configured: "Google Workspace OAuth is not configured on this server.",
  google_no_code: "Google did not return an authorization code.",
  azure_not_configured: "Azure cloud OAuth is not configured on this server.",
  azure_cloud_no_code: "Azure did not return an authorization code.",
  gcp_not_configured: "GCP OAuth is not configured on this server.",
  gcp_cloud_no_code: "GCP did not return an authorization code.",
  org_context_required: "Select an organization before connecting integrations.",
  "Only organization admins can connect integrations.":
    "Only organization admins can connect integrations.",
};

const CONNECTED_LABELS: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  okta: "Okta",
  azure_ad: "Azure AD",
  google_workspace: "Google Workspace",
  azure: "Azure",
  gcp: "Google Cloud",
};

function resolveErrorMessage(raw: string): string {
  if (ERROR_LABELS[raw]) return ERROR_LABELS[raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) return decoded;
  } catch {
    /* ignore */
  }
  return raw.replace(/_/g, " ");
}

export function IntegrationsOAuthFeedback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const error = searchParams.get("error");
  const connected = searchParams.get("connected");
  const repos = searchParams.get("repos");

  const hasFeedback = Boolean(error || connected);

  useEffect(() => {
    if (connected) {
      router.refresh();
    }
  }, [connected, router]);

  const message = useMemo(() => {
    if (error) {
      return { type: "error" as const, text: resolveErrorMessage(error) };
    }
    if (connected) {
      const label = CONNECTED_LABELS[connected] ?? connected;
      const repoSuffix =
        repos && !Number.isNaN(Number(repos))
          ? ` Synced ${repos} ${Number(repos) === 1 ? "repository" : "repositories"}.`
          : "";
      return {
        type: "success" as const,
        text: `${label} connected successfully.${repoSuffix}`,
      };
    }
    return null;
  }, [error, connected, repos]);

  if (!hasFeedback || dismissed || !message) return null;

  function dismiss() {
    setDismissed(true);
    router.replace("/integrations", { scroll: false });
  }

  const isError = message.type === "error";

  return (
    <div
      className={
        isError
          ? "mb-6 flex items-start gap-3 rounded-lg border border-comply-red/40 bg-comply-red/10 px-4 py-3"
          : "mb-6 flex items-start gap-3 rounded-lg border border-comply-green/40 bg-comply-green/10 px-4 py-3"
      }
      role="alert"
    >
      {isError ? (
        <IconAlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-comply-red" />
      ) : (
        <IconCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-comply-green" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${isError ? "text-comply-red" : "text-comply-green"}`}
        >
          {isError ? "Connection failed" : "Connected"}
        </p>
        <p className="mt-1 text-sm text-comply-text-secondary">{message.text}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-1 text-comply-text-tertiary hover:bg-white/5 hover:text-comply-text-primary"
        aria-label="Dismiss"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
