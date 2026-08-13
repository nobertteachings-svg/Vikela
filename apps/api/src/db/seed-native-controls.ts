import { NATIVE_CONTROL_PACKS } from "@vikela/shared/native-control-packs";
import { prisma } from "../lib/prisma.js";

/** Seed framework-native controls with autoSatisfiedBy links to canonical scanner controls. */
export async function seedNativeControls(): Promise<number> {
  let count = 0;

  for (const [slug, controls] of Object.entries(NATIVE_CONTROL_PACKS)) {
    const framework = await prisma.framework.findUnique({ where: { slug } });
    if (!framework) {
      console.warn(`  skip native controls, framework not found: ${slug}`);
      continue;
    }

    for (const def of controls) {
      const control = await prisma.control.upsert({
        where: { code: def.code },
        update: {
          title: def.title,
          description: def.description,
          category: def.category,
          guidance: def.guidance,
          testProcedure: def.testProcedure,
          autoSatisfiedBy: def.autoSatisfiedBy ?? [],
        },
        create: {
          code: def.code,
          title: def.title,
          description: def.description,
          category: def.category,
          guidance: def.guidance,
          testProcedure: def.testProcedure,
          autoSatisfiedBy: def.autoSatisfiedBy ?? [],
        },
      });

      await prisma.controlFramework.upsert({
        where: {
          controlId_frameworkId: { controlId: control.id, frameworkId: framework.id },
        },
        update: { requirement: def.code },
        create: {
          controlId: control.id,
          frameworkId: framework.id,
          requirement: def.code,
        },
      });

      count++;
    }
  }

  return count;
}
