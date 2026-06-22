import { createSign } from "crypto";

function getPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
  return raw.replace(/\\n/g, "\n");
}

/** PEM private key required — not a fingerprint (e.g. SHA256:... from GitHub UI). */
export function isGitHubAppPrivateKeyValid(): boolean {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
  const key = raw.replace(/\\n/g, "\n").trim();
  return key.includes("BEGIN") && key.includes("PRIVATE KEY");
}

export function isGitHubAppConfigured(): boolean {
  return Boolean(process.env.GITHUB_APP_ID && isGitHubAppPrivateKeyValid());
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function createAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = getPrivateKey();
  if (!appId || !privateKey) throw new Error("GitHub App not configured");

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 600, iss: appId })
  ).toString("base64url");

  const signInput = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signInput);
  sign.end();
  const signature = sign.sign(privateKey, "base64url");

  return `${signInput}.${signature}`;
}

export async function getInstallationAccessToken(installationId: number | string): Promise<string> {
  const jwt = createAppJwt();
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub installation token failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

export function getGitHubAppSlug(): string {
  return process.env.GITHUB_APP_SLUG ?? "vikela1";
}

/** Install wizard (repo selection happens on GitHub). Requires a public app or allowed private install. */
export function getGitHubAppInstallUrl(state?: string): string {
  const slug = getGitHubAppSlug();
  const base = `https://github.com/apps/${slug}/installations/new`;
  return state ? `${base}?state=${encodeURIComponent(state)}` : base;
}

export function getGitHubAppPublicPageUrl(): string {
  return `https://github.com/apps/${getGitHubAppSlug()}`;
}

export function getGitHubOAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI ??
    `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/github/callback`;
  const scope = "read:user repo read:org";
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

export async function exchangeGitHubOAuthCode(code: string): Promise<{
  accessToken: string;
  scope: string;
}> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri:
        process.env.GITHUB_REDIRECT_URI ??
        `${process.env.APP_URL ?? "http://localhost:3000"}/api/auth/github/callback`,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
  };

  if (!data.access_token) {
    throw new Error(data.error ?? "Failed to exchange GitHub OAuth code");
  }

  return { accessToken: data.access_token, scope: data.scope ?? "" };
}

export async function getInstallationAccountLogin(installationId: string): Promise<string> {
  const jwt = createAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) return "github";
  const data = (await res.json()) as { account?: { login?: string } };
  return data.account?.login ?? "github";
}
