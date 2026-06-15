import { createHmac, randomUUID } from "node:crypto";
import { prisma } from "./prisma.js";
import { captureProductEvent } from "./product-events.js";

export const ORG_WEBHOOK_EVENTS = ["scan.completed", "gap.created"] as const;
export type OrgWebhookEvent = (typeof ORG_WEBHOOK_EVENTS)[number];

export type OrgWebhookPayload = Record<string, unknown>;

const DELIVERY_TIMEOUT_MS = 8_000;

export function signWebhookBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function deliveryId(): string {
  return randomUUID();
}

/**
 * Fire-and-forget outbound webhooks for an org. Matches endpoints subscribed to `event`.
 * v1: no retry queue — failures are logged server-side only.
 */
export function dispatchOrgWebhooks(
  orgId: string,
  event: OrgWebhookEvent,
  payload: OrgWebhookPayload
): void {
  void deliverOrgWebhooks(orgId, event, payload).catch((err) => {
    console.warn("[org-webhook] dispatch_failed", { orgId, event, err });
  });
}

async function postWebhook(
  hook: { id: string; url: string; secret: string },
  orgId: string,
  event: OrgWebhookEvent,
  payload: OrgWebhookPayload
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const envelope = {
    id: deliveryId(),
    event,
    orgId,
    createdAt: new Date().toISOString(),
    data: payload,
  };
  const body = JSON.stringify(envelope);
  const signature = signWebhookBody(hook.secret, body);
  const signal = AbortSignal.timeout(DELIVERY_TIMEOUT_MS);

  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Vikela-Webhooks/1.0",
        "X-Vikela-Event": event,
        "X-Vikela-Delivery-Id": envelope.id,
        "X-Vikela-Signature": `sha256=${signature}`,
      },
      body,
      signal,
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Delivery failed",
    };
  }
}

async function deliverOrgWebhooks(
  orgId: string,
  event: OrgWebhookEvent,
  payload: OrgWebhookPayload
): Promise<void> {
  const hooks = await prisma.orgWebhook.findMany({
    where: { orgId, isActive: true },
  });

  const targets = hooks.filter((hook) => hook.events.includes(event));
  if (targets.length === 0) return;

  await Promise.all(
    targets.map(async (hook) => {
      const started = Date.now();
      const result = await postWebhook(hook, orgId, event, payload);
      const durationMs = Date.now() - started;

      captureProductEvent(
        "webhook_dispatched",
        {
          orgId,
          event,
          webhookId: hook.id,
          success: result.ok,
          durationMs,
          endpointCount: targets.length,
          httpStatus: result.status,
        },
        { orgId }
      );

      if (!result.ok) {
        console.warn("[org-webhook] delivery_error", {
          orgId,
          event,
          webhookId: hook.id,
          status: result.status,
          error: result.error,
        });
      }
    })
  );
}

export function scanCompletedPayload(scan: {
  id: string;
  scanType: string;
  status: string;
  score: number | null;
  gapCount?: number;
  isLiteScan?: boolean;
  completedAt?: Date | null;
}): OrgWebhookPayload {
  return {
    scanId: scan.id,
    scanType: scan.scanType,
    status: scan.status,
    score: scan.score,
    gapCount: scan.gapCount,
    isLiteScan: scan.isLiteScan ?? false,
    completedAt: (scan.completedAt ?? new Date()).toISOString(),
  };
}

export function emitScanCompleted(
  orgId: string,
  scan: {
    id: string;
    scanType: string;
    status: string;
    score: number | null;
    gapCount?: number;
    isLiteScan?: boolean;
    completedAt?: Date | null;
  }
): void {
  dispatchOrgWebhooks(orgId, "scan.completed", scanCompletedPayload(scan));
}

/** Manual test delivery — uses latest completed scan payload for this org. */
export async function sendTestWebhookScanCompleted(
  orgId: string,
  webhookId: string
): Promise<{ ok: boolean; scanId?: string; status?: number; error?: string }> {
  const hook = await prisma.orgWebhook.findFirst({
    where: { id: webhookId, orgId, isActive: true },
  });
  if (!hook) {
    return { ok: false, error: "Webhook not found" };
  }

  const scan = await prisma.scan.findFirst({
    where: { orgId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  if (!scan) {
    return { ok: false, error: "No completed scan yet — run a scan first" };
  }

  const gapCount = await prisma.gap.count({
    where: { orgId, scanId: scan.id },
  });

  const result = await postWebhook(
    hook,
    orgId,
    "scan.completed",
    scanCompletedPayload({
      id: scan.id,
      scanType: scan.scanType,
      status: scan.status,
      score: scan.score,
      gapCount,
      isLiteScan: scan.isLiteScan,
      completedAt: scan.completedAt,
    })
  );

  return {
    ok: result.ok,
    scanId: scan.id,
    status: result.status,
    error: result.error,
  };
}

export function emitGapCreated(
  orgId: string,
  gap: {
    id: string;
    scanId: string | null;
    title: string;
    severity: string;
    source: string;
    controlCode?: string | null;
    isSample?: boolean;
  }
): void {
  dispatchOrgWebhooks(orgId, "gap.created", {
    gapId: gap.id,
    scanId: gap.scanId,
    title: gap.title,
    severity: gap.severity,
    source: gap.source,
    controlCode: gap.controlCode ?? null,
    isSample: gap.isSample ?? false,
  });
}
