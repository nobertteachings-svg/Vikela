import { prisma } from "./prisma.js";

/** Gap set including native controls whose canonical autoSatisfiedBy controls have gaps. */
export async function buildControlIdsWithGaps(
  orgId: string,
  controlIds: string[]
): Promise<Set<string>> {
  if (controlIds.length === 0) return new Set();

  const controls = await prisma.control.findMany({
    where: { id: { in: controlIds } },
    select: { id: true, code: true, autoSatisfiedBy: true },
  });

  const canonicalCodes = new Set<string>();
  for (const c of controls) {
    for (const code of c.autoSatisfiedBy) canonicalCodes.add(code);
  }

  const canonicalControls =
    canonicalCodes.size > 0
      ? await prisma.control.findMany({
          where: { code: { in: [...canonicalCodes] } },
          select: { id: true, code: true },
        })
      : [];

  const codeToId = new Map<string, string>();
  for (const c of [...controls, ...canonicalControls]) {
    codeToId.set(c.code, c.id);
  }

  const gapCheckIds = [...new Set([...controlIds, ...canonicalControls.map((c) => c.id)])];

  const gapsWithControl = await prisma.gap.groupBy({
    by: ["controlId"],
    where: {
      orgId,
      status: "OPEN",
      controlId: { in: gapCheckIds },
    },
  });

  const directGaps = new Set(
    gapsWithControl.map((g) => g.controlId).filter((id): id is string => id != null)
  );

  const withInherited = new Set(directGaps);

  for (const control of controls) {
    if (directGaps.has(control.id)) continue;
    for (const canonicalCode of control.autoSatisfiedBy) {
      const canonicalId = codeToId.get(canonicalCode);
      if (canonicalId && directGaps.has(canonicalId)) {
        withInherited.add(control.id);
        break;
      }
    }
  }

  return withInherited;
}
