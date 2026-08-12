import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const SLACK_SCOPES = [
  "chat:write",
  "channels:read",
  "groups:read",
  "team:read",
  "incoming-webhook",
].join(",");

function redirectUri(): string {
  return process.env.SLACK_REDIRECT_URI ?? `${APP_URL}/api/auth/slack/callback`;
}

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

export function getSlackOAuthUrl(orgSlug: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("SLACK_CLIENT_ID not configured");

  const state = Buffer.from(JSON.stringify({ orgSlug })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SLACK_SCOPES,
    redirect_uri: redirectUri(),
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export async function handleSlackOAuthCallback(
  code: string,
  stateB64: string
): Promise<{ integrationId: string; teamName?: string }> {
  const state = JSON.parse(Buffer.from(stateB64, "base64url").toString()) as {
    orgSlug?: string;
  };
  const orgSlug = state.orgSlug;
  if (!orgSlug) throw new Error("Missing org in OAuth state");

  const org = await prisma.organization.findFirst({ where: { slug: orgSlug } });
  if (!org) throw new Error(`Organization not found: ${orgSlug}`);

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set");
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri(),
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    bot_user_id?: string;
    team?: { id?: string; name?: string };
    incoming_webhook?: { channel?: string; channel_id?: string; url?: string };
    authed_user?: { id?: string };
  };

  if (!tokenJson.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ? `Slack OAuth: ${tokenJson.error}` : "Slack token exchange failed");
  }

  const teamId = tokenJson.team?.id;
  if (!teamId) throw new Error("Slack OAuth response missing team id");

  await gateNewProviderConnection(org.id, org.plan, "SLACK");

  const teamName = tokenJson.team?.name;
  const metadata = {
    teamId,
    teamName,
    botUserId: tokenJson.bot_user_id,
    authedUserId: tokenJson.authed_user?.id,
    incomingWebhookChannel: tokenJson.incoming_webhook?.channel,
    incomingWebhookChannelId: tokenJson.incoming_webhook?.channel_id,
    // Store webhook URL encrypted separately via refreshToken if present
  };

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "SLACK",
        externalId: teamId,
      },
    },
    update: {
      isActive: true,
      name: teamName ? `Slack (${teamName})` : "Slack",
      accessToken: encrypt(tokenJson.access_token),
      refreshToken: tokenJson.incoming_webhook?.url
        ? encrypt(tokenJson.incoming_webhook.url)
        : undefined,
      metadata,
      lastSyncedAt: new Date(),
      scopes: SLACK_SCOPES.split(","),
    },
    create: {
      orgId: org.id,
      provider: "SLACK",
      category: "COMMUNICATION",
      name: teamName ? `Slack (${teamName})` : "Slack",
      externalId: teamId,
      accessToken: encrypt(tokenJson.access_token),
      refreshToken: tokenJson.incoming_webhook?.url
        ? encrypt(tokenJson.incoming_webhook.url)
        : undefined,
      scopes: SLACK_SCOPES.split(","),
      metadata,
    },
  });

  return { integrationId: integration.id, teamName };
}
