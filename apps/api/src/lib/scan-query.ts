import { prisma } from "./prisma.js";

type ScanWithGapCounts = {
  scanType: string;
  _count: { gaps: number };
  children?: { _count: { gaps: number } }[];
};

/** Gap count for list views. FULL rows sum child scan gaps. */
export function gapsFoundForScan(scan: ScanWithGapCounts): number {
  if (scan.scanType === "FULL") {
    return (scan.children ?? []).reduce((sum, child) => sum + child._count.gaps, 0);
  }
  return scan._count.gaps;
}

export type GapScanFilter =
  | { kind: "none" }
  | { kind: "empty" }
  | { kind: "ids"; ids: string[] };

/**
 * Resolve ?scanId= for gap queries.
 * FULL parent → child scan IDs; unknown scan or FULL with no children → empty.
 */
export async function resolveGapScanFilter(
  orgId: string,
  scanId?: string
): Promise<GapScanFilter> {
  if (!scanId?.trim()) return { kind: "none" };

  const scan = await prisma.scan.findFirst({
    where: { id: scanId, orgId },
    select: { id: true, scanType: true },
  });
  if (!scan) return { kind: "empty" };

  if (scan.scanType === "FULL") {
    const children = await prisma.scan.findMany({
      where: { orgId, parentScanId: scan.id },
      select: { id: true },
    });
    if (children.length === 0) return { kind: "empty" };
    return { kind: "ids", ids: children.map((c) => c.id) };
  }

  return { kind: "ids", ids: [scan.id] };
}

export function gapScanIdWhere(filter: GapScanFilter): { scanId?: string | { in: string[] } } {
  if (filter.kind !== "ids") return {};
  if (filter.ids.length === 1) return { scanId: filter.ids[0]! };
  return { scanId: { in: filter.ids } };
}
