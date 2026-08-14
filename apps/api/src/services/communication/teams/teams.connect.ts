import { createHash } from "crypto";
import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

function isTeamsWebhookUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    host.endsWith("webhook.office.com") ||
    host.endsWith("office.com") ||
    host.endsWith("logic.azure.com") ||
    host.endsWith("environment.api.powerplatform.com") ||
    host.includes("powerautomate")
  );
}

function normalizeWebhookUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Webhook URL required");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Microsoft Teams webhook URL must use https://");
  }
  if (!isTeamsWebhookUrl(parsed)) {
    throw new Error(
      "URL does not look like a Teams Incoming Webhook. In Teams: channel ⋯ → Connectors / Workflows → Incoming Webhook → copy the URL."
    );
  }
  return parsed.toString();
}

/** Soft-validate by posting a minimal Adaptive Card–compatible payload; ignore 4xx from retired connectors if URL shape is valid. */
async function probeWebhook(webhookUrl: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Shieldoq connected successfully. You can ignore this test message.",
    }),
  });

  // Classic Office webhook returns 200/1 on success; Power Automate may return 202.
  if (res.ok || res.status === 202) return;

  const body = await res.text().catch(() => "");
  if (res.status === 404 || res.status === 410) {
    throw new Error(
      "Teams webhook URL is invalid or expired. Create a new Incoming Webhook / Workflow in the channel and paste the new URL."
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Teams rejected this webhook URL (unauthorized). Create a new webhook for the channel.");
  }
  // Some workflow URLs require a specific schema; still accept URL if host matched and we got a non-auth error.
  if (res.status >= 500) {
    throw new Error(`Teams webhook probe failed (${res.status})${body ? `: ${body.slice(0, 120)}` : ""}`);
  }
}

export async function connectMicrosoftTeamsAccount(params: {
  webhookUrl: string;
  name?: string;
  orgSlug: string;
}) {
  const webhookUrl = normalizeWebhookUrl(params.webhookUrl);
  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  await probeWebhook(webhookUrl);
  await gateNewProviderConnection(org, "MICROSOFT_TEAMS");

  const externalId = createHash("sha256").update(webhookUrl).digest("hex").slice(0, 32);
  const displayName = params.name?.trim() || "Microsoft Teams";

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "MICROSOFT_TEAMS",
        externalId,
      },
    },
    update: {
      isActive: true,
      name: displayName,
      accessToken: encrypt(webhookUrl),
      metadata: { webhookHost: new URL(webhookUrl).hostname },
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "MICROSOFT_TEAMS",
      category: "COMMUNICATION",
      name: displayName,
      externalId,
      accessToken: encrypt(webhookUrl),
      scopes: [],
      metadata: { webhookHost: new URL(webhookUrl).hostname },
    },
  });

  return { integration };
}
