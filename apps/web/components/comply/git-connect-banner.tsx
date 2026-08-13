"use client";

import Link from "next/link";
import {
  IconBrandBitbucket,
  IconBrandGithub,
  IconBrandGitlab,
  IconPlugConnected,
} from "@tabler/icons-react";
import {
  bitbucketStartUrl,
  githubInstallUrl,
  gitlabStartUrl,
} from "@/lib/integration-oauth";
import { Card, CardBody } from "./card";
import { useOrgRole } from "@/hooks/use-org-role";

const PROVIDERS = [
  {
    id: "GITHUB",
    name: "GitHub",
    icon: IconBrandGithub,
    href: (orgSlug: string | null | undefined) => githubInstallUrl(orgSlug),
    buttonClass:
      "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)]",
  },
  {
    id: "GITLAB",
    name: "GitLab",
    icon: IconBrandGitlab,
    href: (orgSlug: string | null | undefined) => gitlabStartUrl(orgSlug),
    buttonClass: "border-orange-900/50 bg-orange-600/90 text-white",
  },
  {
    id: "BITBUCKET",
    name: "Bitbucket",
    icon: IconBrandBitbucket,
    href: (orgSlug: string | null | undefined) => bitbucketStartUrl(orgSlug),
    buttonClass: "border-blue-900/50 bg-blue-700/90 text-white",
  },
] as const;

export function GitConnectBanner({
  connectedProviders,
  repoSummary,
  orgSlug,
}: {
  connectedProviders: string[];
  repoSummary?: string;
  orgSlug: string | null;
}) {
  const { isAuditor: auditor, isLoaded } = useOrgRole();
  const anyGit = connectedProviders.some((id) =>
    ["GITHUB", "GITLAB", "BITBUCKET"].includes(id)
  );

  if (anyGit) {
    return (
      <Card elevated className="border-comply-green/25">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-comply-green/30 bg-comply-green/15 text-comply-green">
              <IconPlugConnected size={24} stroke={1.5} />
            </span>
            <div>
              <h2 className="text-lg font-medium text-comply-text-primary">Source control connected</h2>
              <p className="mt-1 text-sm text-comply-text-secondary">
                {repoSummary ?? "Repositories syncing for code evidence"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROVIDERS.filter((p) => connectedProviders.includes(p.id)).map((p) => {
                  const Icon = p.icon;
                  return (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-sm border border-white/[0.08] bg-black/20 px-2 py-0.5 text-xs text-comply-text-secondary"
                    >
                      <Icon size={12} />
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <span className="comply-badge border-comply-green/40 bg-comply-green/15 text-comply-green normal-case">
            Live
          </span>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card elevated className="border-comply-purple-border/25">
      <CardBody>
        <h2 className="text-lg font-medium text-comply-text-primary">Connect source control</h2>
        <p className="mt-1 max-w-2xl text-sm text-comply-text-secondary">
          Link GitHub, GitLab, or Bitbucket to scan repositories—not just one provider.
        </p>
        {!orgSlug && (
          <p className="mt-2 text-xs text-amber-400/90">
            Select or create a workspace in your account before connecting integrations.
          </p>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {PROVIDERS.map((p) => {
            const Icon = p.icon;
            const href = p.href(orgSlug);
            if (isLoaded && auditor) {
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-comply-text-tertiary"
                >
                  <Icon size={18} />
                  {p.name} (view only)
                </div>
              );
            }
            return (
              <Link
                key={p.id}
                href={href}
                className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-all hover:brightness-110 ${p.buttonClass}`}
              >
                <Icon size={18} />
                Connect {p.name}
              </Link>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
