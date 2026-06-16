"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateOrganization, useAuth } from "@clerk/nextjs";
import {
  IconBrandBitbucket,
  IconBrandGithub,
  IconBrandGitlab,
  IconCircleCheck,
  IconLock,
  IconPlugConnected,
  IconRefresh,
  IconScan,
  IconShieldCheck,
} from "@tabler/icons-react";
import { StepIndicator } from "@/components/comply/step-indicator";
import {
  bitbucketStartUrl,
  githubConnectUrl,
  githubManageInstallationsUrl,
  githubOAuthUrl,
  gitlabStartUrl,
} from "@/lib/integration-oauth";
import { apiGet, apiPost, apiPut, setOrgContext } from "@/lib/api";
import { cn } from "@/lib/utils";

type OnboardingStatus = {
  mode: "dev" | "clerk";
  orgReady: boolean;
  memberReady: boolean;
  orgSlug?: string;
  needsClerkOrg?: boolean;
};

type OnboardingRepo = {
  id: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  provider: string;
  isActive: boolean;
  isPrivate: boolean;
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const MOCK_REPOS = [
  { id: "1", name: "acme-corp / backend-api", language: "Python", lastPush: "2h ago" },
  { id: "2", name: "acme-corp / frontend", language: "TypeScript", lastPush: "1d ago" },
  { id: "3", name: "acme-corp / infra", language: "Terraform", lastPush: "3d ago" },
] as const;

const SCAN_CHECKS = [
  "Branch protection & required reviews",
  "Secrets and dependency exposure",
  "IAM-adjacent config in infra repos",
] as const;

const TRUST_LINES = [
  "Read-only OAuth — we never store your source code",
  "Findings map to SOC 2, HIPAA, ISO 27001, and more",
  "AWS, Azure, GCP, and identity providers come next",
] as const;

const ONBOARDING_GIT_PROVIDERS = [
  {
    id: "github",
    name: "GitHub",
    icon: IconBrandGithub,
    href: (orgSlug: string) => githubConnectUrl(orgSlug, { from: "onboarding" }),
    className:
      "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)] hover:brightness-110",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: IconBrandGitlab,
    href: (orgSlug: string) => gitlabStartUrl(orgSlug, { from: "onboarding" }),
    className: "border-orange-900/50 bg-orange-600/90 text-white hover:brightness-110",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: IconBrandBitbucket,
    href: (orgSlug: string) => bitbucketStartUrl(orgSlug, { from: "onboarding" }),
    className: "border-blue-900/50 bg-blue-700/90 text-white hover:brightness-110",
  },
] as const;

const PROVIDER_LABELS: Record<string, string> = {
  GITHUB: "GitHub",
  GITLAB: "GitLab",
  BITBUCKET: "Bitbucket",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

function ConnectAside() {
  return (
    <div className="mb-12 max-w-md lg:mb-0 lg:flex-1">
      <SectionLabel>Onboarding · Step 1 of 3</SectionLabel>
      <h1 className="mt-4 bg-gradient-to-br from-[#faf9f5] via-[#d8d6ce] to-[#888780] bg-clip-text text-3xl font-medium leading-tight tracking-tight text-transparent text-balance sm:text-4xl">
        Connect your repositories
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-comply-text-secondary">
        Choose your git provider, authorize read-only access, and we&apos;ll import the repositories
        you grant access to—then run your first compliance scan.
      </p>

      <ul className="mt-8 space-y-3">
        {TRUST_LINES.map((line) => (
          <li key={line} className="flex gap-2.5 text-xs leading-relaxed text-comply-text-secondary">
            <IconCircleCheck size={15} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
            {line}
          </li>
        ))}
      </ul>

      <div className="marketing-panel relative mt-8 p-4">
        <div className="flex items-center gap-2 text-comply-text-tertiary">
          <IconScan size={16} stroke={1.5} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">First scan checks</span>
        </div>
        <ul className="mt-3 space-y-2">
          {SCAN_CHECKS.map((check) => (
            <li
              key={check}
              className="flex items-start gap-2 text-xs leading-relaxed text-comply-text-secondary"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-comply-purple-border" />
              {check}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[10px] text-comply-muted">
          <IconLock size={12} stroke={1.5} />
          No code is stored — metadata and policy signals only
        </p>
      </div>
    </div>
  );
}

function LoadingPanel({ message = "Preparing your workspace…" }: { message?: string }) {
  return (
    <div className="marketing-panel marketing-panel-highlight relative w-full max-w-[520px] p-8">
      <StepIndicator currentStep={1} />
      <div className="mt-8 flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-comply-purple-border/30 border-t-comply-purple"
          aria-hidden
        />
        <p className="text-sm text-comply-text-secondary">{message}</p>
      </div>
    </div>
  );
}

function SignInPanel() {
  return (
    <div className="marketing-panel marketing-panel-highlight relative w-full max-w-[520px] p-8">
      <StepIndicator currentStep={1} />
      <h2 className="relative mt-2 text-center text-xl font-medium tracking-tight text-comply-text-primary">
        Sign in to continue
      </h2>
      <p className="relative mt-1.5 text-center text-sm leading-relaxed text-comply-text-secondary">
        Create an account or sign in, then connect your repositories here.
      </p>
      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/sign-up" className="btn-purple-cta flex h-10 items-center justify-center px-5 text-sm font-medium">
          Create account
        </Link>
        <Link
          href="/sign-in"
          className="flex h-10 items-center justify-center rounded-md border border-white/[0.12] px-5 text-sm text-comply-text-secondary transition-colors hover:text-comply-text-primary"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

function NeedsWorkspacePanel() {
  return (
    <div className="marketing-panel marketing-panel-highlight relative w-full max-w-[520px] p-8">
      <StepIndicator currentStep={1} />
      <h2 className="relative mt-2 text-center text-xl font-medium tracking-tight text-comply-text-primary">
        Create your workspace
      </h2>
      <p className="relative mt-1.5 text-center text-sm leading-relaxed text-comply-text-secondary">
        Vikela links repositories per workspace. Create one for your company, then connect GitHub,
        GitLab, or Bitbucket.
      </p>
      <div className="relative mt-6 flex justify-center [&_.cl-rootBox]:mx-auto">
        <CreateOrganization
          routing="hash"
          afterCreateOrganizationUrl="/onboarding/connect-repos"
        />
      </div>
    </div>
  );
}

type GitHubConnectInfo = {
  appInstall: boolean;
  oauth: boolean;
  appSlug: string;
  appPublicPageUrl: string;
};

function GitHubConnectSection({ orgSlug }: { orgSlug: string }) {
  const [info, setInfo] = useState<GitHubConnectInfo | null>(null);

  useEffect(() => {
    apiGet<GitHubConnectInfo>("/api/v1/auth/github/connect-info")
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const showPrivateAppHint = info && !info.appInstall;

  return (
    <div className="relative mt-4 rounded-md border border-white/[0.08] bg-black/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={githubConnectUrl(orgSlug, { from: "onboarding" })}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-2 rounded-md border py-3.5 text-[11px] font-medium transition-all duration-200",
            ONBOARDING_GIT_PROVIDERS[0]!.className
          )}
        >
          <IconBrandGithub size={22} stroke={1.25} />
          {info?.oauth && !info.appInstall ? "Connect GitHub" : "Install GitHub App"}
        </Link>
        {info?.oauth && (
          <Link
            href={githubOAuthUrl(orgSlug, { from: "onboarding" })}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-white/[0.12] bg-white/[0.04] py-3.5 text-[11px] font-medium text-comply-text-secondary transition-colors hover:text-comply-text-primary"
          >
            <IconBrandGithub size={18} stroke={1.25} />
            Connect with GitHub OAuth
          </Link>
        )}
      </div>
      {showPrivateAppHint && (
        <p className="mt-3 text-[11px] leading-relaxed text-amber-200/90">
          If you only see &quot;Vikela is a private GitHub App&quot; on{" "}
          <a
            href={info.appPublicPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            github.com/apps/{info.appSlug}
          </a>
          , the app is private or the PEM key is missing. Use <strong>Connect with GitHub OAuth</strong>{" "}
          above, or in GitHub → Developer settings → GitHub Apps → Vikela → set visibility to{" "}
          <strong>Public</strong> and paste the downloaded <strong>.pem</strong> into{" "}
          <code className="font-mono text-[10px]">GITHUB_APP_PRIVATE_KEY</code>.
        </p>
      )}
      {!showPrivateAppHint && (
        <p className="mt-3 text-center text-[11px] leading-relaxed text-comply-muted">
          On the install screen, choose <strong className="text-comply-text-secondary">Only select repositories</strong> and
          check the repos to scan.
        </p>
      )}
    </div>
  );
}

function GitProviderGrid({ orgSlug }: { orgSlug: string }) {
  const otherProviders = ONBOARDING_GIT_PROVIDERS.filter((p) => p.id !== "github");

  return (
    <div className="relative mt-5">
      <p className="text-center text-xs leading-relaxed text-comply-text-secondary">
        Connect your git provider. Repository access is granted on GitHub/GitLab/Bitbucket, then you
        choose which repos to scan here.
      </p>
      <GitHubConnectSection orgSlug={orgSlug} />
      {otherProviders.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {otherProviders.map((provider) => {
            const Icon = provider.icon;
            return (
              <Link
                key={provider.id}
                href={provider.href(orgSlug)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-md border py-3.5 text-[11px] font-medium transition-all duration-200",
                  provider.className
                )}
              >
                <Icon size={20} stroke={1.25} />
                {provider.name}
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-comply-muted">
        <IconShieldCheck size={12} stroke={1.5} className="text-comply-green" />
        Read-only access · revoke anytime from your provider
      </p>
    </div>
  );
}

function RepoPickerList({
  repos,
  selectedIds,
  scanRepoId,
  onToggle,
  onScanRepoChange,
}: {
  repos: OnboardingRepo[];
  selectedIds: Set<string>;
  scanRepoId: string | null;
  onToggle: (id: string) => void;
  onScanRepoChange: (id: string) => void;
}) {
  return (
    <ul className="relative mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
      {repos.map((repo) => {
        const selected = selectedIds.has(repo.id);
        const isScanTarget = scanRepoId === repo.id;
        return (
          <li
            key={repo.id}
            className={cn(
              "rounded-md border px-3 py-3 transition-colors",
              selected
                ? "border-[var(--green-dark)]/40 bg-[color-mix(in_srgb,var(--green)_8%,transparent)]"
                : "border-white/[0.08] bg-black/25"
            )}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(repo.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--green)]"
                aria-label={`Include ${repo.fullName}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-comply-text-primary">{repo.fullName}</p>
                <p className="mt-0.5 text-xs text-comply-text-secondary">
                  {PROVIDER_LABELS[repo.provider] ?? repo.provider}
                  <span className="mx-1.5 text-comply-muted">·</span>
                  {repo.defaultBranch}
                  {repo.isPrivate ? (
                    <>
                      <span className="mx-1.5 text-comply-muted">·</span>
                      private
                    </>
                  ) : null}
                </p>
                {selected && selectedIds.size > 1 && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-comply-text-secondary">
                    <input
                      type="radio"
                      name="scan-repo"
                      checked={isScanTarget}
                      onChange={() => onScanRepoChange(repo.id)}
                      className="accent-[var(--purple)]"
                    />
                    Scan this repo first
                  </label>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function NoReposFromProviderPanel({ provider }: { provider: string }) {
  const label = PROVIDER_LABELS[provider.toUpperCase()] ?? provider;
  return (
    <div className="relative mt-5 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-xs leading-relaxed text-amber-100/90">
      <p className="font-medium text-amber-50">{label} is connected, but no repositories were shared yet.</p>
      {provider === "github" && (
        <p className="mt-2">
          Open{" "}
          <a
            href={githubManageInstallationsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-comply-purple-light underline"
          >
            GitHub installed apps
          </a>
          , select <strong>Vikela</strong>, click <strong>Configure</strong>, and grant access to the
          repositories you want scanned. Then return here and click <strong>Refresh repositories</strong>.
        </p>
      )}
      {provider !== "github" && (
        <p className="mt-2">
          Re-authorize {label} and grant repository access, then refresh the list below.
        </p>
      )}
    </div>
  );
}

function MockRepoList({
  connected,
  onToggle,
}: {
  connected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="relative mt-5 space-y-2">
      {MOCK_REPOS.map((repo) => {
        const isConnected = connected.has(repo.id);
        return (
          <li
            key={repo.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors duration-200",
              isConnected
                ? "border-[var(--green-dark)]/40 bg-[color-mix(in_srgb,var(--green)_8%,transparent)]"
                : "border-white/[0.08] bg-black/25"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-comply-text-primary">{repo.name}</p>
              <p className="mt-0.5 text-xs text-comply-text-secondary">
                <span className="font-mono text-[10px] text-comply-text-tertiary">{repo.language}</span>
                <span className="mx-1.5 text-comply-muted">·</span>
                Last push {repo.lastPush}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggle(repo.id)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                isConnected
                  ? "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)]"
                  : "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary hover:border-comply-purple-border/40 hover:text-comply-text-primary"
              )}
            >
              {isConnected ? "✓ Connected" : "Connect"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ConnectPanel({
  isDev,
  error,
  connectSlug,
  needsClerkOrg,
  repos,
  reposLoading,
  justConnected,
  connected,
  selectedIds,
  scanRepoId,
  saving,
  onToggleRepo,
  onToggleSelection,
  onScanRepoChange,
  onRefreshRepos,
  onContinue,
  onRetry,
  retrying,
}: {
  isDev: boolean;
  error: string | null;
  connectSlug: string | null;
  needsClerkOrg: boolean;
  repos: OnboardingRepo[];
  reposLoading: boolean;
  justConnected: string | null;
  connected: Set<string>;
  selectedIds: Set<string>;
  scanRepoId: string | null;
  saving: boolean;
  onToggleRepo: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onScanRepoChange: (id: string) => void;
  onRefreshRepos: () => void;
  onContinue: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const hasImportedRepos = repos.length > 0;
  const canContinue = isDev ? connected.size > 0 : selectedIds.size > 0;

  if (needsClerkOrg) {
    return <NeedsWorkspacePanel />;
  }

  return (
    <div className="marketing-panel marketing-panel-highlight relative w-full max-w-[520px] p-8">
      <StepIndicator currentStep={1} />

      <h2 className="relative mt-2 text-center text-xl font-medium tracking-tight text-comply-text-primary">
        Select repositories to scan
      </h2>
      <p className="relative mt-1.5 text-center text-sm leading-relaxed text-comply-text-secondary">
        After connecting GitHub, choose which repos Vikela can read. Your first scan runs on the
        repo you pick below.
      </p>

      {isDev && (
        <div
          className="relative mt-5 rounded-md border px-3 py-2.5 text-center text-xs leading-relaxed text-comply-text-secondary"
          style={{
            borderColor: "color-mix(in srgb, var(--purple-border) 35%, transparent)",
            background: "color-mix(in srgb, var(--purple) 10%, transparent)",
          }}
        >
          <strong className="font-medium text-comply-text-primary">Local dev mode</strong> — demo org
          with mock repos, or connect live integrations from Integrations after onboarding.
        </div>
      )}

      {justConnected && (
        <p
          className="relative mt-4 rounded-md border px-3 py-2 text-center text-xs text-comply-green"
          style={{
            borderColor: "color-mix(in srgb, var(--green-border) 40%, transparent)",
            background: "color-mix(in srgb, var(--green) 12%, transparent)",
          }}
        >
          <IconPlugConnected size={14} className="mr-1 inline" />
          {PROVIDER_LABELS[justConnected.toUpperCase()] ?? justConnected} account verified
          {reposLoading
            ? " — importing repositories…"
            : hasImportedRepos
              ? ` — ${repos.length} available`
              : ""}
        </p>
      )}

      {error && (
        <div className="relative mt-4 rounded-md border border-red-900/40 bg-red-950/30 px-3 py-2.5 text-center text-xs leading-relaxed text-red-300">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-2 inline-flex items-center gap-1 font-medium text-comply-purple-light hover:underline disabled:opacity-50"
          >
            <IconRefresh size={12} className={retrying ? "animate-spin" : ""} />
            {retrying ? "Retrying…" : "Retry setup"}
          </button>
        </div>
      )}

      {connectSlug ? (
        <>
          {hasImportedRepos ? (
            <div className="relative mt-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                  Repositories to scan
                </p>
                <button
                  type="button"
                  onClick={onRefreshRepos}
                  disabled={reposLoading}
                  className="inline-flex items-center gap-1 text-[10px] text-comply-muted hover:text-comply-text-secondary disabled:opacity-50"
                >
                  <IconRefresh size={11} className={reposLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
              <RepoPickerList
                repos={repos}
                selectedIds={selectedIds}
                scanRepoId={scanRepoId}
                onToggle={onToggleSelection}
                onScanRepoChange={onScanRepoChange}
              />
            </div>
          ) : justConnected ? (
            <NoReposFromProviderPanel provider={justConnected} />
          ) : null}

          {!hasImportedRepos && <GitProviderGrid orgSlug={connectSlug} />}

          {hasImportedRepos && (
            <p className="relative mt-4 text-center text-[11px] text-comply-muted">
              Need more repos?{" "}
              <a
                href={githubManageInstallationsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-comply-purple-light hover:underline"
              >
                Update GitHub app access
              </a>{" "}
              or connect another provider, then refresh.
            </p>
          )}

          {isDev && !hasImportedRepos && (
            <>
              <p className="relative mt-6 text-center text-xs text-comply-text-tertiary">
                Or select demo repos (no OAuth):
              </p>
              <MockRepoList connected={connected} onToggle={onToggleRepo} />
            </>
          )}
        </>
      ) : (
        <div className="relative mt-8 flex flex-col items-center gap-3">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2 border-comply-purple-border/30 border-t-comply-purple"
            aria-hidden
          />
          <p className="text-sm text-comply-text-secondary">Loading workspace…</p>
        </div>
      )}

      <div className="relative mt-8 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
        <Link
          href="/onboarding/scan"
          className="text-xs text-comply-muted transition-colors hover:text-comply-text-secondary"
        >
          Skip for now
        </Link>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue || saving}
          className={cn(
            "btn-purple-cta flex h-10 min-w-[160px] items-center justify-center px-4 text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          {saving ? "Saving…" : canContinue ? "Run first scan →" : "Select a repository"}
        </button>
      </div>
    </div>
  );
}

function OnboardingConnectReposInner() {
  if (!hasClerk) {
    return <OnboardingConnectReposBody skipAuth />;
  }
  return <OnboardingConnectReposClerk />;
}

export function OnboardingConnectRepos() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24">
          <ConnectAside />
          <LoadingPanel />
        </div>
      }
    >
      <OnboardingConnectReposInner />
    </Suspense>
  );
}

function OnboardingConnectReposClerk() {
  const { isLoaded, isSignedIn, orgId, orgSlug } = useAuth();
  return (
    <OnboardingConnectReposBody
      isLoaded={isLoaded}
      isSignedIn={Boolean(isSignedIn)}
      clerkOrgId={orgId ?? undefined}
      clerkOrgSlug={orgSlug ?? undefined}
      requireAuth
    />
  );
}

function OnboardingConnectReposBody({
  skipAuth = false,
  isLoaded = true,
  isSignedIn = true,
  clerkOrgId,
  clerkOrgSlug,
  requireAuth = false,
}: {
  skipAuth?: boolean;
  isLoaded?: boolean;
  isSignedIn?: boolean;
  clerkOrgId?: string;
  clerkOrgSlug?: string;
  requireAuth?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected");
  const urlError = searchParams.get("error");

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [repos, setRepos] = useState<OnboardingRepo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanRepoId, setScanRepoId] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshStatus = useCallback(async (): Promise<OnboardingStatus> => {
    const data = await apiGet<OnboardingStatus>("/api/v1/onboarding/status");
    setStatus(data);
    if (data.orgSlug) {
      setOrgContext(data.orgSlug, clerkOrgId);
    }
    return data;
  }, [clerkOrgId]);

  const applyRepoList = useCallback((list: OnboardingRepo[]) => {
    setRepos(list);
    const active = list.filter((r) => r.isActive);
    const initial = new Set(active.map((r) => r.id));
    if (initial.size === 0 && list.length === 1) {
      initial.add(list[0]!.id);
    }
    setSelectedIds(initial);
    const first = Array.from(initial)[0] ?? null;
    setScanRepoId(first);
  }, []);

  const loadRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const list = await apiGet<OnboardingRepo[]>("/api/v1/onboarding/repositories");
      applyRepoList(list);
    } catch (e) {
      setRepos([]);
      setSelectedIds(new Set());
      setScanRepoId(null);
      const message = e instanceof Error ? e.message : "Could not load repositories";
      setError(message);
    } finally {
      setReposLoading(false);
    }
  }, [applyRepoList]);

  const syncAndLoadRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const result = await apiPost<{ synced: number; repositories: OnboardingRepo[] }>(
        "/api/v1/onboarding/sync-repositories"
      );
      applyRepoList(result.repositories);
    } catch (e) {
      try {
        await loadRepos();
      } catch (loadErr) {
        const message =
          loadErr instanceof Error ? loadErr.message : "Could not sync repositories";
        setError(message);
      }
    } finally {
      setReposLoading(false);
    }
  }, [applyRepoList, loadRepos]);

  const bootstrap = useCallback(async () => {
    setError(null);
    const data = await refreshStatus();
    if (data.needsClerkOrg) return data;
    if (data.orgReady && !data.memberReady && data.mode === "clerk") {
      const ensured = await apiPost<OnboardingStatus>("/api/v1/onboarding/ensure-membership");
      setStatus(ensured);
      if (ensured.orgSlug) setOrgContext(ensured.orgSlug, clerkOrgId);
      return ensured;
    }
    return data;
  }, [refreshStatus, clerkOrgId]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await apiPost<OnboardingStatus>("/api/v1/onboarding/ensure-membership");
      await bootstrap();
      await loadRepos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setRetrying(false);
    }
  };

  const toggleRepo = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) {
        setScanRepoId(null);
        return next;
      }
      if (!scanRepoId || !next.has(scanRepoId)) {
        setScanRepoId(Array.from(next)[0] ?? null);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (status?.mode === "dev" && connected.size > 0) {
      router.push("/onboarding/scan");
      return;
    }
    if (selectedIds.size === 0) return;

    setSaving(true);
    setError(null);
    try {
      const activeRepoIds = [...selectedIds];
      const primary = scanRepoId && selectedIds.has(scanRepoId) ? scanRepoId : activeRepoIds[0]!;
      await apiPut<{ activeCount: number; scanRepoId: string | null }>(
        "/api/v1/onboarding/repository-selection",
        { activeRepoIds }
      );
      router.push(`/onboarding/scan?repoId=${encodeURIComponent(primary)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save repository selection");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!hasClerk || skipAuth) {
      bootstrap().catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load workspace status");
      });
      return;
    }
    if (!isLoaded) return;
    if (requireAuth && !isSignedIn) return;

    bootstrap().catch((e) => {
      const message = e instanceof Error ? e.message : "Could not load workspace status";
      setError(/unauthorized/i.test(message)
        ? "Your session could not be verified. Sign in again to connect repositories."
        : /failed to fetch|cannot reach the api/i.test(message)
          ? "Cannot reach the API. Confirm the API service is deployed and NEXT_PUBLIC_API_URL is set on the Web service, then redeploy."
          : message);
    });
  }, [isLoaded, isSignedIn, bootstrap, skipAuth, requireAuth]);

  useEffect(() => {
    if (urlError) setError(decodeURIComponent(urlError.replace(/\+/g, " ")));
  }, [urlError]);

  /** Must be the Vikela DB slug (not Clerk slug) so OAuth resolves the correct org. */
  const connectSlug = status?.orgSlug ?? (status?.mode === "dev" ? "demo" : null);

  useEffect(() => {
    if (!status?.orgReady || !status.memberReady) return;
    if (justConnected) {
      syncAndLoadRepos();
    } else {
      loadRepos();
    }
  }, [status?.orgReady, status?.memberReady, loadRepos, syncAndLoadRepos, justConnected]);

  const awaitingAuth = requireAuth && isLoaded && !isSignedIn;
  const needsClerkOrg = Boolean(status?.needsClerkOrg);
  const isDev = status?.mode === "dev";

  if (awaitingAuth) {
    return (
      <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24">
        <ConnectAside />
        <SignInPanel />
      </div>
    );
  }

  if (requireAuth && !isLoaded) {
    return (
      <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24">
        <ConnectAside />
        <LoadingPanel message="Loading your session…" />
      </div>
    );
  }

  if (!status && !error) {
    return (
      <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24">
        <ConnectAside />
        <LoadingPanel />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24">
      <ConnectAside />
      <ConnectPanel
        isDev={isDev}
        error={error}
        connectSlug={needsClerkOrg ? null : connectSlug}
        needsClerkOrg={needsClerkOrg}
        repos={repos}
        reposLoading={reposLoading}
        justConnected={justConnected}
        connected={connected}
        selectedIds={selectedIds}
        scanRepoId={scanRepoId}
        saving={saving}
        onToggleRepo={toggleRepo}
        onToggleSelection={toggleSelection}
        onScanRepoChange={setScanRepoId}
        onRefreshRepos={syncAndLoadRepos}
        onContinue={handleContinue}
        onRetry={handleRetry}
        retrying={retrying}
      />
    </div>
  );
}

export default OnboardingConnectRepos;
