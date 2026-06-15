import type { IntegrationProvider } from "@prisma/client";
import type { IGitProvider } from "./provider.interface.js";
import { GithubProvider } from "./github/github.provider.js";
import { GitlabProvider } from "./gitlab/gitlab.provider.js";
import { BitbucketProvider } from "./bitbucket/bitbucket.provider.js";

export type GitProviderName = "github" | "gitlab" | "bitbucket";

export function toGitProviderName(provider: IntegrationProvider): GitProviderName | null {
  const map: Partial<Record<IntegrationProvider, GitProviderName>> = {
    GITHUB: "github",
    GITLAB: "gitlab",
    BITBUCKET: "bitbucket",
  };
  return map[provider] ?? null;
}

export function getGitProvider(provider: GitProviderName, token: string): IGitProvider {
  switch (provider) {
    case "github":
      return new GithubProvider(token);
    case "gitlab":
      return new GitlabProvider(token);
    case "bitbucket":
      return new BitbucketProvider(token);
    default:
      throw new Error(`Unsupported git provider: ${provider}`);
  }
}
