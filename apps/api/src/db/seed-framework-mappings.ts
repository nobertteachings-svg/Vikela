import { FRAMEWORK_CONTROL_MAPPINGS } from "@vikela/shared/framework-control-mappings";
import { prisma } from "../lib/prisma.js";

/** Seed ControlFramework links for all non-SOC2 frameworks (shared control graph). */
export async function seedFrameworkControlMappings(): Promise<void> {
  for (const [slug, mappings] of Object.entries(FRAMEWORK_CONTROL_MAPPINGS)) {
    const framework = await prisma.framework.findUnique({ where: { slug } });
    if (!framework) {
      console.warn(`  skip mappings — framework not found: ${slug}`);
      continue;
    }

    for (const { controlCode, requirement } of mappings) {
      const control = await prisma.control.findUnique({ where: { code: controlCode } });
      if (!control) {
        console.warn(`  skip mapping ${slug} → ${controlCode} (control missing)`);
        continue;
      }

      await prisma.controlFramework.upsert({
        where: {
          controlId_frameworkId: { controlId: control.id, frameworkId: framework.id },
        },
        update: { requirement },
        create: {
          controlId: control.id,
          frameworkId: framework.id,
          requirement,
        },
      });
    }
  }
}

/** Backfill OrgControl rows for orgs enrolled in frameworks before mappings existed. */
export async function backfillOrgControlsForEnrolledFrameworks(orgId: string): Promise<number> {
  const { enrollOrgInFramework } = await import("../lib/enroll-org-framework.js");
  const enrolled = await prisma.orgFramework.findMany({
    where: { orgId },
    select: { frameworkId: true },
  });

  let created = 0;
  for (const row of enrolled) {
    const result = await enrollOrgInFramework(orgId, row.frameworkId);
    created += result.controlsCreated;
  }
  return created;
}
