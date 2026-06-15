import { connectGcpCloudAccount } from "./gcp.connect.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const GCP_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/cloud-platform.read-only",
].join(" ");

function redirectUri(): string {
  return process.env.GCP_CLOUD_REDIRECT_URI ?? `${APP_URL}/api/auth/gcp-cloud/callback`;
}

export function getGcpCloudOAuthUrl(state: string): string {
  const clientId = process.env.GCP_CLIENT_ID;
  if (!clientId) throw new Error("GCP_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GCP_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGcpCloudOAuthCallback(code: string, stateB64: string) {
  const { orgSlug } = JSON.parse(Buffer.from(stateB64, "base64url").toString()) as {
    orgSlug: string;
  };

  const clientId = process.env.GCP_CLIENT_ID!;
  const clientSecret = process.env.GCP_CLIENT_SECRET!;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`GCP token exchange failed: ${await tokenRes.text()}`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
  };

  const projectsRes = await fetch(
    "https://cloudresourcemanager.googleapis.com/v1/projects",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  let projectId = "demo-gcp-project";
  let projectName = "GCP Project";

  if (projectsRes.ok) {
    const data = (await projectsRes.json()) as {
      projects?: { projectId: string; name: string }[];
    };
    const first = data.projects?.[0];
    if (first) {
      projectId = first.projectId;
      projectName = first.name;
    }
  }

  return connectGcpCloudAccount({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    projectId,
    projectName,
    orgSlug,
  });
}
