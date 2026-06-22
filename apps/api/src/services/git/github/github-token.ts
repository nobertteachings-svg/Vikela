import type { Integration } from "@prisma/client";
import { decrypt } from "../../../lib/crypto.js";
import {
  getInstallationAccessToken,
  isGitHubAppConfigured,
} from "../../../lib/github-app.js";

type GitHubIntegrationMetadata = {
  installationId?: number;
  oauth?: boolean;
  accountLogin?: string;
  login?: string;
};

function metadata(integration: Integration): GitHubIntegrationMetadata {
  const raw = integration.metadata;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as GitHubIntegrationMetadata;
}

/** Fresh GitHub API token — mints installation tokens; OAuth tokens are stored long-lived. */
export async function resolveGithubAccessToken(integration: Integration): Promise<string> {
  const meta = metadata(integration);
  const installationId = meta.installationId;

  if (installationId != null && isGitHubAppConfigured()) {
    return getInstallationAccessToken(installationId);
  }

  let token: string;
  try {
    token = decrypt(integration.accessToken);
  } catch {
    throw new Error("GitHub integration token is invalid — reconnect GitHub");
  }

  if (!token || token === "pending") {
    throw new Error(
      "GitHub App is not fully configured — set GITHUB_APP_PRIVATE_KEY on the API or use Connect with GitHub OAuth"
    );
  }

  return token;
}

export function isGithubAppIntegration(integration: Integration): boolean {
  return metadata(integration).installationId != null;
}
