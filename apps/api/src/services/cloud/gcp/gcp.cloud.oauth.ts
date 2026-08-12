import { prisma } from "../../../lib/prisma.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";
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

  let projectId = process.env.GCP_PROJECT_ID?.trim() || "";
  let projectName = process.env.GCP_PROJECT_NAME?.trim() || projectId;

  if (!projectId) {
    const authHeader = { Authorization: `Bearer ${tokens.access_token}` };
    type Listed = { projectId: string; name: string };
    const listed: Listed[] = [];

    // v1 list (legacy)
    const v1Res = await fetch(
      "https://cloudresourcemanager.googleapis.com/v1/projects",
      { headers: authHeader }
    );
    if (v1Res.ok) {
      const data = (await v1Res.json()) as {
        projects?: { projectId: string; name: string; lifecycleState?: string }[];
      };
      for (const p of data.projects ?? []) {
        if (!p.lifecycleState || p.lifecycleState === "ACTIVE") {
          listed.push({ projectId: p.projectId, name: p.name });
        }
      }
    } else {
      const body = await v1Res.text();
      const disabled =
        /Cloud Resource Manager API has not been used|SERVICE_DISABLED|accessNotConfigured/i.test(
          body
        );
      if (disabled) {
        throw new Error(
          "GCP project listing failed: enable Cloud Resource Manager API in the Google Cloud project that owns this OAuth client (APIs & Services → Library → Cloud Resource Manager API → Enable), then reconnect."
        );
      }
      // Non-fatal if v3 search still works
      if (v1Res.status !== 403 && v1Res.status !== 404) {
        throw new Error(`GCP project listing failed: ${v1Res.status} — ${body.slice(0, 280)}`);
      }
    }

    // v3 search (often returns projects v1 list misses under orgs)
    if (listed.length === 0) {
      const v3Res = await fetch(
        "https://cloudresourcemanager.googleapis.com/v3/projects:search?query=state:ACTIVE",
        { headers: authHeader }
      );
      if (v3Res.ok) {
        const data = (await v3Res.json()) as {
          projects?: { projectId: string; displayName?: string; name?: string }[];
        };
        for (const p of data.projects ?? []) {
          listed.push({
            projectId: p.projectId,
            name: p.displayName || p.projectId,
          });
        }
      }
    }

    const first = listed[0];
    if (!first) {
      throw new Error(
        "No GCP projects found for this Google account. In Google Cloud Console (same account), create or open a project, copy Project ID (not number), set GCP_PROJECT_ID in .env, restart the API, then reconnect."
      );
    }
    projectId = first.projectId;
    projectName = first.name;
  }

  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);
  await gateNewProviderConnection(org.id, org.plan, "GCP");

  return connectGcpCloudAccount({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    projectId,
    projectName: projectName || projectId,
    orgSlug,
  });
}
