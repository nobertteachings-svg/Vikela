export type CollectFromGapsResult = {
  created: number;
  skipped: number;
  openGaps: number;
};

export function formatCollectFromGapsMessage(result: CollectFromGapsResult): string {
  if (result.created > 0) {
    if (result.skipped > 0) {
      const createdLabel = result.created === 1 ? "evidence record" : "evidence records";
      const skippedLabel = result.skipped === 1 ? "already existed" : "already existed";
      return `${result.created} ${createdLabel} created, ${result.skipped} ${skippedLabel}`;
    }
    const createdLabel = result.created === 1 ? "evidence record" : "evidence records";
    return `${result.created} ${createdLabel} created`;
  }
  if (result.skipped > 0) {
    return "Evidence already collected for all open gaps";
  }
  if (result.openGaps === 0) {
    return "No open gaps to collect from, run a scan first";
  }
  return "No evidence created, open gaps aren't linked to controls yet";
}

export type CollectFromGapsMessageTone = "success" | "neutral" | "muted";

export function collectFromGapsMessageTone(result: CollectFromGapsResult): CollectFromGapsMessageTone {
  if (result.created > 0) return "success";
  if (result.skipped > 0) return "neutral";
  return "muted";
}
