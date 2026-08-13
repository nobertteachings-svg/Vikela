export type GitOAuthFrom = "onboarding";

/** Browser links for git OAuth, same-origin on the web app, proxied to the API. */
function webGitAuthPath(
  path: string,
  orgSlug: string | null | undefined,
  from?: GitOAuthFrom,
  clerkOrgId?: string | null
): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const params = new URLSearchParams({ org: orgSlug });
  if (from === "onboarding") params.set("from", "onboarding");
  if (clerkOrgId) params.set("clerkOrg", clerkOrgId);
  return `${path}?${params.toString()}`;
}

function withFromOnboarding(base: string, from?: GitOAuthFrom): string {
  if (from !== "onboarding") return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}from=onboarding`;
}

/** Browser OAuth start URLs, same-origin `/api/v1/..` (rewritten to the API). */
export function integrationOAuthUrl(
  path: string,
  orgSlug: string | null | undefined
): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}org=${encodeURIComponent(orgSlug)}`;
}

/** GitHub, Settings, Applications, Installed GitHub Apps, configure repository access */
export function githubManageInstallationsUrl(): string {
  return "https://github.com/settings/installations";
}

/** Primary GitHub connect. App install (Railway-style). Falls back to OAuth on the API if App PEM is missing. */
export function githubConnectUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom; clerkOrgId?: string | null }
): string {
  return webGitAuthPath("/api/auth/github/install", orgSlug, opts?.from, opts?.clerkOrgId);
}

/** Explicit App install entrypoint (same as githubConnectUrl). */
export function githubInstallUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom; clerkOrgId?: string | null }
): string {
  return webGitAuthPath("/api/auth/github/install", orgSlug, opts?.from, opts?.clerkOrgId);
}

/** OAuth fallback when App install is unavailable or user prefers classic OAuth. */
export function githubOAuthUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom; clerkOrgId?: string | null }
): string {
  return webGitAuthPath("/api/auth/github/oauth", orgSlug, opts?.from, opts?.clerkOrgId);
}

export function gitlabStartUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return webGitAuthPath("/api/auth/gitlab/start", orgSlug, opts?.from);
}

export function bitbucketStartUrl(
  orgSlug: string | null | undefined,
  opts?: { from?: GitOAuthFrom }
): string {
  return webGitAuthPath("/api/auth/bitbucket/start", orgSlug, opts?.from);
}

export function oktaStartUrl(domain: string, orgSlug: string | null | undefined): string {
  if (!orgSlug) return "/sign-in?reason=org_required";
  const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `/api/v1/auth/okta/start?domain=${encodeURIComponent(d)}&org=${encodeURIComponent(orgSlug)}`;
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

export function slackStartUrl(orgSlug: string | null | undefined): string {
  return integrationOAuthUrl("/api/v1/auth/slack/start", orgSlug);
}
