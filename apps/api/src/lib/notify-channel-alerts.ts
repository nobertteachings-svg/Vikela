import { decrypt } from "./crypto.js";
import { prisma } from "./prisma.js";

export type ChannelAlertKind = "scan_complete" | "gap_alerts";

export type ChannelAlertPayload = {
  kind: ChannelAlertKind;
  orgName: string;
  text: string;
  scansUrl?: string;
  gapsUrl?: string;
};

/**
 * Post scan/gap alerts to connected Slack and Microsoft Teams integrations.
 * Fire-and-forget from callers; failures are logged, never thrown to scan paths.
 */
export async function deliverChannelAlerts(
  orgId: string,
  payload: ChannelAlertPayload
): Promise<void> {
  const integrations = await prisma.integration.findMany({
    where: {
      orgId,
      isActive: true,
      provider: { in: ["SLACK", "MICROSOFT_TEAMS"] },
    },
    select: {
      id: true,
      provider: true,
      accessToken: true,
      refreshToken: true,
      metadata: true,
    },
  });

  await Promise.all(
    integrations.map(async (row) => {
      try {
        if (row.provider === "SLACK") {
          await postSlack(row, payload);
        } else if (row.provider === "MICROSOFT_TEAMS") {
          await postTeams(row.accessToken, payload);
        }
      } catch (err) {
        console.warn("[channel-alerts] delivery failed", {
          orgId,
          integrationId: row.id,
          provider: row.provider,
          err,
        });
      }
    })
  );
}

async function postSlack(
  row: {
    accessToken: string | null;
    refreshToken: string | null;
    metadata: unknown;
  },
  payload: ChannelAlertPayload
): Promise<void> {
  const text = formatPlainText(payload);

  // Prefer incoming webhook URL when OAuth returned one (simplest channel post).
  if (row.refreshToken) {
    const webhookUrl = decrypt(row.refreshToken);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`Slack webhook HTTP ${res.status}`);
    }
    return;
  }

  if (!row.accessToken) return;
  const token = decrypt(row.accessToken);
  const meta = (row.metadata ?? {}) as {
    incomingWebhookChannelId?: string;
  };
  const channel = meta.incomingWebhookChannelId;
  if (!channel) {
    console.warn("[channel-alerts] Slack connected without webhook channel; skip chat.postMessage");
    return;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!json.ok) {
    throw new Error(json.error ?? "chat.postMessage failed");
  }
}

async function postTeams(
  accessToken: string | null,
  payload: ChannelAlertPayload
): Promise<void> {
  if (!accessToken) return;
  const webhookUrl = decrypt(accessToken);
  const text = formatPlainText(payload);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Teams webhook HTTP ${res.status}`);
  }
}

function formatPlainText(payload: ChannelAlertPayload): string {
  const link =
    payload.kind === "gap_alerts"
      ? payload.gapsUrl
      : payload.scansUrl;
  return link ? `${payload.text}\n${link}` : payload.text;
}
