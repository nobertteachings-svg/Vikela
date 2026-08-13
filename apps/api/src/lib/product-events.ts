import { getPostHogClient } from "./posthog.js";

export type LiteScanFallbackReason =
  | "none"
  | "list_failed"
  | "sparse_findings"
  | "no_repo";

export type LiteScanGitProvider = "github" | "gitlab" | "bitbucket";

export type LiteScanCompletedPayload = {
  orgId: string;
  orgSlug: string;
  source: "repo" | "sample" | "mixed";
  repoId?: string;
  findingCount: number;
  scanId: string;
  repoStack?: string;
  provider?: LiteScanGitProvider;
  listFailed?: boolean;
  filesListed?: number;
  fallbackReason?: LiteScanFallbackReason;
};

export type ProductEventContext = {
  distinctId?: string;
  orgId?: string;
};

export function captureProductEvent(
  name: string,
  properties: Record<string, unknown>,
  context: ProductEventContext = {}
): void {
  const at = new Date().toISOString();
  const payload = { ...properties, at };

  if (process.env.NODE_ENV !== "production") {
    console.info("[product-event]", JSON.stringify({ name, ...payload }));
  }

  const client = getPostHogClient();
  if (client) {
    const distinctId = context.distinctId ?? context.orgId ?? "system";
    client.capture({
      distinctId,
      event: name,
      properties: payload,
      groups: context.orgId ? { company: context.orgId } : undefined,
    });
  }

  if (process.env.PRODUCT_EVENTS_WEBHOOK_URL) {
    fetch(process.env.PRODUCT_EVENTS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...payload }),
    }).catch(() => {
      // Non-blocking
    });
  }
}

/** Product analytics hook, wired to PostHog when POSTHOG_API_KEY is set. */
export function trackLiteScanCompleted(payload: LiteScanCompletedPayload): void {
  captureProductEvent(
    "lite_scan_completed",
    {
      orgSlug: payload.orgSlug,
      source: payload.source,
      repoId: payload.repoId,
      findingCount: payload.findingCount,
      scanId: payload.scanId,
      repoStack: payload.repoStack,
      provider: payload.provider,
      listFailed: payload.listFailed,
      filesListed: payload.filesListed,
      fallbackReason: payload.fallbackReason,
    },
    { orgId: payload.orgId }
  );
}

export function resolveLiteScanFallbackReason(params: {
  realGapCount: number;
  listFailed: boolean;
  minRealFindings: number;
  noRepo?: boolean;
}): LiteScanFallbackReason {
  if (params.noRepo) return "no_repo";
  if (params.realGapCount >= params.minRealFindings) return "none";
  if (params.listFailed) return "list_failed";
  return "sparse_findings";
}
