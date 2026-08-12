import { prisma } from "../../lib/prisma.js";
import { COURSE_CATALOG } from "./course-catalog.js";
import { assignModuleToAllMembers } from "./sync-module-stats.js";

/** Ensure every built-in course exists for the org and is assigned to all members. */
export async function syncCatalogCoursesForOrg(orgId: string): Promise<{
  created: number;
  updated: number;
  assigned: number;
}> {
  let created = 0;
  let updated = 0;
  let assigned = 0;
  const now = Date.now();

  for (const course of COURSE_CATALOG) {
    const dueAt =
      course.dueInDays != null
        ? new Date(now + course.dueInDays * 24 * 60 * 60 * 1000)
        : null;

    const existing = await prisma.trainingModule.findFirst({
      where: { orgId, contentKey: course.key },
    });

    if (!existing) {
      // Adopt a legacy module with the same name if present (pre-contentKey).
      const byName = await prisma.trainingModule.findFirst({
        where: { orgId, name: course.name, contentKey: null },
      });
      if (byName) {
        await prisma.trainingModule.update({
          where: { id: byName.id },
          data: {
            contentKey: course.key,
            description: course.description,
            framework: course.framework,
            durationMin: course.durationMin,
            dueAt: byName.dueAt ?? dueAt,
          },
        });
        updated += 1;
        const result = await assignModuleToAllMembers(orgId, byName.id);
        assigned += result.created;
        continue;
      }

      const mod = await prisma.trainingModule.create({
        data: {
          orgId,
          contentKey: course.key,
          name: course.name,
          description: course.description,
          framework: course.framework,
          durationMin: course.durationMin,
          dueAt,
          completed: 0,
          assigned: 0,
          status: "ON_TRACK",
        },
      });
      created += 1;
      const result = await assignModuleToAllMembers(orgId, mod.id);
      assigned += result.created;
      continue;
    }

    await prisma.trainingModule.update({
      where: { id: existing.id },
      data: {
        name: course.name,
        description: course.description,
        framework: course.framework,
        durationMin: course.durationMin,
        // Keep existing due dates; only fill if missing.
        ...(existing.dueAt ? {} : { dueAt }),
      },
    });
    updated += 1;
    const result = await assignModuleToAllMembers(orgId, existing.id);
    assigned += result.created;
  }

  return { created, updated, assigned };
}
