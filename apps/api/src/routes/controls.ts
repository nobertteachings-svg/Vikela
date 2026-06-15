import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireRead } from "../lib/authorization.js";
import { deriveControlStatus, hasOrgCompletedScan } from "../lib/framework-score.js";
import { backfillOrgControlsForEnrolledFrameworks } from "../db/seed-framework-mappings.js";

export const controlsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/controls", async (req, reply) => {
    await requireRead(req);
    const query = req.query as { framework?: string; status?: string; category?: string };

    const org = await resolveOrganization(req);
    if (!org) {
      return reply.send(ok([]));
    }

    await backfillOrgControlsForEnrolledFrameworks(org.id);

    const enrolledFrameworks = await prisma.orgFramework.findMany({
      where: { orgId: org.id },
      select: { frameworkId: true },
    });
    const enrolledFrameworkIds = enrolledFrameworks.map((f) => f.frameworkId);

    if (enrolledFrameworkIds.length === 0) {
      return reply.send(ok([]));
    }

    const controls = await prisma.control.findMany({
      where: {
        orgControls: { some: { orgId: org.id } },
        frameworks: {
          some: query.framework
            ? { framework: { slug: query.framework } }
            : { frameworkId: { in: enrolledFrameworkIds } },
        },
        ...(query.category ? { category: query.category } : {}),
      },
      include: {
        frameworks: { include: { framework: true } },
        orgControls: {
          where: { orgId: org.id },
          include: { _count: { select: { evidence: true } } },
        },
        _count: {
          select: {
            gaps: { where: { orgId: org.id, status: "OPEN" } },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const hasScan = await hasOrgCompletedScan(org.id);

    const data = controls
      .filter((c) => {
        if (!query.status) return true;
        const openGapCount = c._count.gaps;
        const derivedStatus = deriveControlStatus(openGapCount, hasScan);
        return derivedStatus === query.status;
      })
      .map((c) => {
        const oc = c.orgControls[0];
        const openGapCount = c._count.gaps;
        const frameworkRefs = c.frameworks
          .filter((cf) => enrolledFrameworkIds.includes(cf.frameworkId))
          .map((cf) => ({
            slug: cf.framework.slug,
            name: cf.framework.name,
          }));
        return {
          id: c.id,
          code: c.code,
          title: c.title,
          category: c.category,
          description: c.description,
          guidance: c.guidance,
          status: deriveControlStatus(openGapCount, hasScan),
          frameworks: frameworkRefs,
          evidenceCount: oc?._count.evidence ?? 0,
          openGapCount,
          updatedAt: oc?.updatedAt?.toISOString() ?? null,
        };
      });

    return reply.send(ok(data));
  });

  app.get("/controls/:code", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send({ data: null, error: "Organization not found" });

    const { code } = req.params as { code: string };
    const control = await prisma.control.findUnique({
      where: { code },
      include: {
        frameworks: { include: { framework: true } },
        orgControls: {
          where: { orgId: org.id },
          include: { _count: { select: { evidence: true } } },
        },
        gaps: {
          where: { orgId: org.id, status: "OPEN" },
          orderBy: { severity: "asc" },
          take: 10,
        },
      },
    });

    if (!control) {
      return reply.status(404).send({ data: null, error: "Control not found" });
    }

    const oc = control.orgControls[0];
    const hasScan = await hasOrgCompletedScan(org.id);
    const openGapCount = control.gaps.length;

    return reply.send(
      ok({
        id: control.id,
        code: control.code,
        title: control.title,
        description: control.description,
        category: control.category,
        guidance: control.guidance,
        status: deriveControlStatus(openGapCount, hasScan),
        evidenceCount: oc?._count.evidence ?? 0,
        openGapCount,
        updatedAt: oc?.updatedAt?.toISOString() ?? null,
        frameworks: control.frameworks.map((cf) => ({
          slug: cf.framework.slug,
          name: cf.framework.name,
          requirement: cf.requirement,
        })),
        gaps: control.gaps.map((g) => ({
          id: g.id,
          title: g.title,
          severity: g.severity,
          status: g.status,
        })),
      })
    );
  });
};
