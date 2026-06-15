import type { FastifyPluginAsync } from "fastify";
import {
  getGitHubAppInstallUrl,
  getGitHubAppPublicPageUrl,
  getGitHubAppSlug,
  getGitHubOAuthUrl,
  isGitHubAppConfigured,
  isGitHubOAuthConfigured,
} from "../lib/github-app.js";
import {
  handleGitHubInstallationCallback,
  handleGitHubOAuthCallback,
} from "../services/git/github/github.oauth.js";
import { getGitLabOAuthUrl, handleGitLabOAuthCallback } from "../services/git/gitlab/gitlab.oauth.js";
import {
  getBitbucketOAuthUrl,
  handleBitbucketOAuthCallback,
} from "../services/git/bitbucket/bitbucket.oauth.js";
import { getOktaOAuthUrl, handleOktaOAuthCallback } from "../services/identity/okta/okta.oauth.js";
import {
  getAzureAdOAuthUrl,
  handleAzureAdOAuthCallback,
} from "../services/identity/azure-ad/azure-ad.oauth.js";
import {
  getGoogleWorkspaceOAuthUrl,
  handleGoogleWorkspaceOAuthCallback,
} from "../services/identity/google-workspace/google-workspace.oauth.js";
import { handleAzureCloudOAuthCallback } from "../services/cloud/azure/azure.cloud.oauth.js";
import { handleGcpCloudOAuthCallback } from "../services/cloud/gcp/gcp.cloud.oauth.js";
import { getAzureCloudOAuthUrl } from "../services/cloud/azure/azure.cloud.oauth.js";
import { getGcpCloudOAuthUrl } from "../services/cloud/gcp/gcp.cloud.oauth.js";
import { scheduleCloudAccountScan } from "../jobs/cloud-scan.schedule.js";
import { oauthOrgErrorRedirect, resolveOAuthOrgSlug } from "../lib/oauth-org.js";
import {
  encodeOAuthState,
  oauthSuccessRedirect,
  parseOAuthState,
  type OAuthReturnTo,
} from "../lib/oauth-state.js";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/response.js";
import { applyOnboardingRepoDefaults } from "../services/onboarding/repository-selection.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const INTEGRATIONS = `${APP_URL}/integrations`;

function oauthReturnTo(query: { from?: string }): OAuthReturnTo {
  return query.from === "onboarding" ? "onboarding" : "integrations";
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/auth/github/connect-info", async (_req, reply) => {
    return reply.send(
      ok({
        appInstall: isGitHubAppConfigured(),
        oauth: isGitHubOAuthConfigured(),
        appSlug: getGitHubAppSlug(),
        appPublicPageUrl: getGitHubAppPublicPageUrl(),
        installPath: "/api/v1/auth/github/install",
        oauthPath: "/api/v1/auth/github/oauth",
      })
    );
  });

  app.get("/auth/github/install", async (req, reply) => {
    const query = req.query as { org?: string; from?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    const state = encodeOAuthState(orgSlug, oauthReturnTo(query));

    if (isGitHubAppConfigured()) {
      return reply.redirect(getGitHubAppInstallUrl(state));
    }

    if (isGitHubOAuthConfigured()) {
      return reply.redirect(getGitHubOAuthUrl(state));
    }

    const returnBase = oauthReturnTo(query) === "onboarding" ? `${APP_URL}/onboarding/connect-repos` : INTEGRATIONS;
    return reply.redirect(
      `${returnBase}?error=${encodeURIComponent("GitHub is not configured. Set GITHUB_APP_ID + PEM private key, or GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET.")}`
    );
  });

  app.get("/auth/github/callback", async (req, reply) => {
    const query = req.query as {
      code?: string;
      installation_id?: string;
      setup_action?: string;
      state?: string;
    };
    const { orgSlug, returnTo } = parseOAuthState(query.state);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());

    try {
      if (query.installation_id) {
        const { repoCount } = await handleGitHubInstallationCallback(
          query.installation_id,
          orgSlug
        );
        if (returnTo === "onboarding") {
          const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
          if (org) await applyOnboardingRepoDefaults(org.id);
        }
        return reply.redirect(
          oauthSuccessRedirect(returnTo, {
            connected: "github",
            repos: String(repoCount),
          })
        );
      }

      if (query.code) {
        const { repoCount } = await handleGitHubOAuthCallback(query.code, orgSlug);
        if (returnTo === "onboarding") {
          const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
          if (org) await applyOnboardingRepoDefaults(org.id);
        }
        return reply.redirect(
          oauthSuccessRedirect(returnTo, {
            connected: "github",
            repos: String(repoCount),
          })
        );
      }

      return reply.redirect(`${INTEGRATIONS}?error=github_missing_params`);
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "GitHub connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/github/oauth", async (req, reply) => {
    const query = req.query as { org?: string; from?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!isGitHubOAuthConfigured()) {
      const returnBase =
        oauthReturnTo(query) === "onboarding" ? `${APP_URL}/onboarding/connect-repos` : INTEGRATIONS;
      return reply.redirect(
        `${returnBase}?error=${encodeURIComponent("GitHub OAuth is not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET).")}`
      );
    }
    return reply.redirect(getGitHubOAuthUrl(encodeOAuthState(orgSlug, oauthReturnTo(query))));
  });

  app.get("/auth/gitlab/start", async (req, reply) => {
    const query = req.query as { org?: string; from?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.GITLAB_APP_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=gitlab_not_configured`);
    }
    return reply.redirect(getGitLabOAuthUrl(encodeOAuthState(orgSlug, oauthReturnTo(query))));
  });

  app.get("/auth/gitlab/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string };
    if (!query.code) {
      return reply.redirect(`${INTEGRATIONS}?error=gitlab_no_code`);
    }
    try {
      const { orgSlug, returnTo } = parseOAuthState(query.state);
      if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
      const { repoCount } = await handleGitLabOAuthCallback(query.code, orgSlug);
      if (returnTo === "onboarding") {
        const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
        if (org) await applyOnboardingRepoDefaults(org.id);
      }
      return reply.redirect(
        oauthSuccessRedirect(returnTo, {
          connected: "gitlab",
          repos: String(repoCount),
        })
      );
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "GitLab connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/bitbucket/start", async (req, reply) => {
    const query = req.query as { org?: string; from?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.BITBUCKET_CLIENT_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=bitbucket_not_configured`);
    }
    return reply.redirect(getBitbucketOAuthUrl(encodeOAuthState(orgSlug, oauthReturnTo(query))));
  });

  app.get("/auth/bitbucket/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string };
    if (!query.code) {
      return reply.redirect(`${INTEGRATIONS}?error=bitbucket_no_code`);
    }
    try {
      const { orgSlug, returnTo } = parseOAuthState(query.state);
      if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
      const { repoCount } = await handleBitbucketOAuthCallback(query.code, orgSlug);
      if (returnTo === "onboarding") {
        const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
        if (org) await applyOnboardingRepoDefaults(org.id);
      }
      return reply.redirect(
        oauthSuccessRedirect(returnTo, {
          connected: "bitbucket",
          repos: String(repoCount),
        })
      );
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "Bitbucket connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/okta/start", async (req, reply) => {
    const query = req.query as { domain?: string; org?: string };
    if (!query.domain) {
      return reply.redirect(`${INTEGRATIONS}?error=okta_domain_required`);
    }
    if (!process.env.OKTA_CLIENT_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=okta_not_configured`);
    }
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    return reply.redirect(getOktaOAuthUrl(query.domain, orgSlug));
  });

  app.get("/auth/okta/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.redirect(
        `${INTEGRATIONS}?error=${encodeURIComponent(query.error)}`
      );
    }
    if (!query.code || !query.state) {
      return reply.redirect(`${INTEGRATIONS}?error=okta_no_code`);
    }
    try {
      await handleOktaOAuthCallback(query.code, query.state);
      return reply.redirect(`${INTEGRATIONS}?connected=okta`);
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "Okta connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/azure-ad/start", async (req, reply) => {
    const query = req.query as { org?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.AZURE_CLIENT_ID && !process.env.AZURE_AD_CLIENT_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=azure_ad_not_configured`);
    }
    return reply.redirect(getAzureAdOAuthUrl(orgSlug));
  });

  app.get("/auth/azure-ad/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.redirect(
        `${INTEGRATIONS}?error=${encodeURIComponent(query.error)}`
      );
    }
    if (!query.code) {
      return reply.redirect(`${INTEGRATIONS}?error=azure_ad_no_code`);
    }
    try {
      const orgSlug = resolveOAuthOrgSlug(query.state);
      if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
      await handleAzureAdOAuthCallback(query.code, orgSlug);
      return reply.redirect(`${INTEGRATIONS}?connected=azure_ad`);
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "Azure AD connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/google-workspace/start", async (req, reply) => {
    const query = req.query as { org?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.GOOGLE_WORKSPACE_CLIENT_ID) {
      return reply.redirect(
        `${INTEGRATIONS}?error=google_workspace_not_configured`
      );
    }
    return reply.redirect(getGoogleWorkspaceOAuthUrl(orgSlug));
  });

  app.get("/auth/google-workspace/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.redirect(
        `${INTEGRATIONS}?error=${encodeURIComponent(query.error)}`
      );
    }
    if (!query.code) {
      return reply.redirect(`${INTEGRATIONS}?error=google_no_code`);
    }
    try {
      const orgSlug = resolveOAuthOrgSlug(query.state);
      if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
      await handleGoogleWorkspaceOAuthCallback(query.code, orgSlug);
      return reply.redirect(`${INTEGRATIONS}?connected=google_workspace`);
    } catch (e) {
      const msg = encodeURIComponent(
        e instanceof Error ? e.message : "Google Workspace connect failed"
      );
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/azure-cloud/start", async (req, reply) => {
    const query = req.query as { org?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.AZURE_CLIENT_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=azure_not_configured`);
    }
    const state = Buffer.from(JSON.stringify({ orgSlug })).toString(
      "base64url"
    );
    return reply.redirect(getAzureCloudOAuthUrl(state));
  });

  app.get("/auth/azure-cloud/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.redirect(
        `${INTEGRATIONS}?error=${encodeURIComponent(query.error)}`
      );
    }
    if (!query.code || !query.state) {
      return reply.redirect(`${INTEGRATIONS}?error=azure_cloud_no_code`);
    }
    try {
      const result = await handleAzureCloudOAuthCallback(query.code, query.state);
      await scheduleCloudAccountScan(result.cloudAccount.id);
      return reply.redirect(`${INTEGRATIONS}?connected=azure`);
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "Azure cloud connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });

  app.get("/auth/gcp-cloud/start", async (req, reply) => {
    const query = req.query as { org?: string };
    const orgSlug = resolveOAuthOrgSlug(query.org);
    if (!orgSlug) return reply.redirect(oauthOrgErrorRedirect());
    if (!process.env.GCP_CLIENT_ID) {
      return reply.redirect(`${INTEGRATIONS}?error=gcp_not_configured`);
    }
    const state = Buffer.from(JSON.stringify({ orgSlug })).toString(
      "base64url"
    );
    return reply.redirect(getGcpCloudOAuthUrl(state));
  });

  app.get("/auth/gcp-cloud/callback", async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) {
      return reply.redirect(
        `${INTEGRATIONS}?error=${encodeURIComponent(query.error)}`
      );
    }
    if (!query.code || !query.state) {
      return reply.redirect(`${INTEGRATIONS}?error=gcp_cloud_no_code`);
    }
    try {
      const result = await handleGcpCloudOAuthCallback(query.code, query.state);
      await scheduleCloudAccountScan(result.cloudAccount.id);
      return reply.redirect(`${INTEGRATIONS}?connected=gcp`);
    } catch (e) {
      const msg = encodeURIComponent(e instanceof Error ? e.message : "GCP connect failed");
      return reply.redirect(`${INTEGRATIONS}?error=${msg}`);
    }
  });
};
