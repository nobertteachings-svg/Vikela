import { COMPLIANCE_FRAMEWORKS } from "@vikela/shared/framework-catalog";
import { prisma } from "../../lib/prisma.js";
import { enrollOrgInFramework, unenrollOrgFromFramework } from "../../lib/enroll-org-framework.js";

export async function setOnboardingFrameworkSelection(
  orgId: string,
  slugs: string[]
): Promise<{ enrolled: string[]; catalogOnly: string[]; skipped: string[] }> {
  const uniqueSlugs = [...new Set(slugs.map((s) => s.trim().toLowerCase()))];
  const validCatalog = new Set(COMPLIANCE_FRAMEWORKS.map((f) => f.slug));

  const enrolled: string[] = [];
  const catalogOnly: string[] = [];
  const skipped: string[] = [];

  const frameworks = await prisma.framework.findMany({
    where: { slug: { in: uniqueSlugs }, isActive: true },
    include: { _count: { select: { controls: true } } },
  });
  const bySlug = new Map(frameworks.map((f) => [f.slug, f]));

  for (const slug of uniqueSlugs) {
    if (!validCatalog.has(slug)) {
      skipped.push(slug);
      continue;
    }
    const fw = bySlug.get(slug);
    if (!fw) {
      skipped.push(slug);
      continue;
    }
    await enrollOrgInFramework(orgId, fw.id);
    if (fw._count.controls === 0) catalogOnly.push(slug);
    else enrolled.push(slug);
  }

  const current = await prisma.orgFramework.findMany({
    where: { orgId },
    include: { framework: { select: { slug: true } } },
  });

  for (const row of current) {
    if (!uniqueSlugs.includes(row.framework.slug)) {
      await unenrollOrgFromFramework(orgId, row.frameworkId);
    }
  }

  return { enrolled, catalogOnly, skipped };
}
