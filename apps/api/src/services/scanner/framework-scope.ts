import { prisma } from "../../lib/prisma.js";

export type OrgFrameworkScanScope = {
  orgId: string;
  frameworkSlugs: string[];
  /** Control codes the org is actively tracking (enrolled frameworks). */
  allowedControlCodes: Set<string>;
};

/** Load enrolled frameworks and control codes for scan scoping. */
export async function getOrgFrameworkScanScope(orgId: string): Promise<OrgFrameworkScanScope> {
  const enrolled = await prisma.orgFramework.findMany({
    where: { orgId },
    include: {
      framework: {
        include: {
          controls: { include: { control: { select: { code: true, autoSatisfiedBy: true } } } },
        },
      },
    },
  });

  const frameworkSlugs = enrolled.map((e) => e.framework.slug);
  const allowedControlCodes = new Set<string>();

  for (const e of enrolled) {
    for (const link of e.framework.controls) {
      allowedControlCodes.add(link.control.code);
      for (const canonical of link.control.autoSatisfiedBy ?? []) {
        allowedControlCodes.add(canonical);
      }
    }
  }

  const orgControls = await prisma.orgControl.findMany({
    where: { orgId },
    include: { control: { select: { code: true, autoSatisfiedBy: true } } },
  });
  for (const oc of orgControls) {
    allowedControlCodes.add(oc.control.code);
    for (const canonical of oc.control.autoSatisfiedBy ?? []) {
      allowedControlCodes.add(canonical);
    }
  }

  return { orgId, frameworkSlugs, allowedControlCodes };
}

/** Keep findings relevant to enrolled frameworks; unmapped findings pass through. */
export function filterFindingsForScope<T extends { controlCode?: string }>(
  findings: T[],
  scope: OrgFrameworkScanScope
): T[] {
  if (scope.frameworkSlugs.length === 0) return findings;

  return findings.filter((f) => {
    if (!f.controlCode) return true;
    return scope.allowedControlCodes.has(f.controlCode);
  });
}
