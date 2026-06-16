import { getApiUrl } from "./api-url";

const API_URL = getApiUrl();

export type GitOAuthFrom = "onboarding";

/** Browser links for git OAuth — same-origin on the web app (port 3000), not the API (3001). */
function webGitAuthPath(
  path: string,
  orgSlug: string | null | undefined,
  from?: GitOAuthFrom
): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const params = new URLSearchParams({ org: orgSlug });
  if (from === "onboarding") params.set("from", "onboarding");
  return `${path}?${params.toString()}`;
}

function withFromOnboarding(base: string, from?: GitOAuthFrom): string {
  if (from !== "onboarding") return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=onboarding`;
}

/** Server-side / API-to-API URLs (callbacks, server fetch). */
export function integrationOAuthUrl(
  path: string,
  orgSlug: string | null | undefined
): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const sep = path.includes("?") ? "&" : "?";
  return `${API_URL}${path}${sep}org=${encodeURIComponent(orgSlug)}`;
}

/** GitHub → Settings → Applications → Installed GitHub Apps → configure repository access */
export function githubManageInstallationsUrl(): string {
  return "https://github.com/settings/installations";
}

/** Server picks GitHub App install or OAuth fallback based on env configuration. */
export function githubConnectUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return webGitAuthPath("/api/auth/github/install", orgSlug, opts?.from);
}

/** @deprecated Use githubConnectUrl — same install entrypoint with OAuth fallback. */
export function githubInstallUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return githubConnectUrl(orgSlug, opts);
}

export function githubOAuthUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return webGitAuthPath("/api/auth/github/oauth", orgSlug, opts?.from);
}

export function gitlabStartUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return withFromOnboarding(
    integrationOAuthUrl("/api/v1/auth/gitlab/start", orgSlug),
    opts?.from
  );
}

export function bitbucketStartUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return withFromOnboarding(
    integrationOAuthUrl("/api/v1/auth/bitbucket/start", orgSlug),
    opts?.from
  );
}

export function oktaStartUrl(domain: string, orgSlug: string | null | undefined): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${API_URL}/api/v1/auth/okta/start?domain=${encodeURIComponent(d)}&org=${encodeURIComponent(orgSlug)}`;
}

export function azureCloudStartUrl(orgSlug: string | null | undefined): string {
  return integrationOAuthUrl("/api/v1/auth/azure-cloud/start", orgSlug);
}

export function gcpCloudStartUrl(orgSlug: string | null | undefined): string {
  return integrationOAuthUrl("/api/v1/auth/gcp-cloud/start", orgSlug);
}

export function googleWorkspaceStartUrl(orgSlug: string | null | undefined): string {
  return integrationOAuthUrl("/api/v1/auth/google-workspace/start", orgSlug);
}

export function azureAdStartUrl(orgSlug: string | null | undefined): string {
  return integrationOAuthUrl("/api/v1/auth/azure-ad/start", orgSlug);
}
