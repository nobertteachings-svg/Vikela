import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireRead, requireWrite } from "../lib/authorization.js";
import { optionalDateFilter } from "../lib/audit-date-range.js";
import { redactCodeSnippet } from "../lib/redact-secrets.js";
import { logAuditEvent } from "../lib/audit-log.js";
import type { Severity } from "@vikela/shared";
import type { GapStatus } from "@prisma/client";
import { gapSourceWhere, parseGapSourceFilter } from "../lib/gap-query.js";
import { gapScanIdWhere, resolveGapScanFilter } from "../lib/scan-query.js";

const WRITABLE_GAP_STATUSES: GapStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

export const gapsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/gaps", async (req, reply) => {
    await requireRead(req);
    const query = req.query as {
      severity?: string;
      status?: string;
      source?: string;
      cloudProvider?: string;
      framework?: string;
      control?: string;
      scanId?: string;
      from?: string;
      to?: string;
    };

    const org = await resolveOrganization(req);
    if (!org) {
      return reply.send(ok([]));
    }

    const sourceFilter = parseGapSourceFilter(query.source);
    const sourceWhere = gapSourceWhere(sourceFilter);
    const isResolved = query.status === "RESOLVED";
    const scanFilter = await resolveGapScanFilter(org.id, query.scanId);
    if (scanFilter.kind === "empty") {
      return reply.send(ok([]));
    }
    const scanWhere = gapScanIdWhere(scanFilter);

    if (query.control) {
      const control = await prisma.control.findUnique({
        where: { code: query.control },
        select: { id: true },
      });
      if (!control) {
        return reply.send(ok([]));
      }

      const createdAt = optionalDateFilter(query.from, query.to);
      const gaps = await prisma.gap.findMany({
        where: {
          orgId: org.id,
          controlId: control.id,
          ...(query.severity ? { severity: query.severity as never } : {}),
          ...(query.status ? { status: query.status as never } : { status: "OPEN" }),
          ...sourceWhere,
          ...scanWhere,
          ...(query.cloudProvider ? { cloudProvider: query.cloudProvider as never } : {}),
          ...(createdAt ? { createdAt } : {}),
        },
        include: { control: true, repo: true, cloudAccount: true },
        orderBy: isResolved ? { resolvedAt: "desc" } : { createdAt: "desc" },
      });

      const sorted = sortGaps(gaps, isResolved);

      return reply.send(ok(sorted.map(mapGap)));
    }

    const createdAt = optionalDateFilter(query.from, query.to);

    const enrolledFrameworkIds = query.framework
      ? undefined
      : (
          await prisma.orgFramework.findMany({
            where: { orgId: org.id },
            select: { frameworkId: true },
          })
        ).map((f) => f.frameworkId);

    const gaps = await prisma.gap.findMany({
      where: {
        orgId: org.id,
        ...(query.severity ? { severity: query.severity as never } : {}),
        ...(query.status ? { status: query.status as never } : { status: "OPEN" }),
        ...sourceWhere,
        ...scanWhere,
        ...(query.cloudProvider ? { cloudProvider: query.cloudProvider as never } : {}),
        ...(query.framework
          ? {
              control: {
                frameworks: { some: { framework: { slug: query.framework } } },
              },
            }
          : enrolledFrameworkIds && enrolledFrameworkIds.length > 0
            ? {
                OR: [
                  { controlId: null },
                  {
                    control: {
                      frameworks: { some: { frameworkId: { in: enrolledFrameworkIds } } },
                    },
                  },
                ],
              }
            : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      include: { control: true, repo: true, cloudAccount: true },
      orderBy: isResolved ? { resolvedAt: "desc" } : { createdAt: "desc" },
    });

    const sorted = sortGaps(gaps, isResolved);

    return reply.send(ok(sorted.map(mapGap)));
  });

  app.get("/gaps/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send({ data: null, error: "Organization not found" });

    const { id } = req.params as { id: string };
    const g = await prisma.gap.findFirst({
      where: { id, orgId: org.id },
      include: { control: true, repo: true, cloudAccount: true },
    });
    if (!g) return reply.status(404).send({ data: null, error: "Gap not found" });
    return reply.send(ok(mapGap(g)));
  });

  app.patch("/gaps/:id", async (req, reply) => {
    let member;
    try {
      member = await requireWrite(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const { id } = req.params as { id: string };
    const body = req.body as { status?: string };
    if (!body.status || !WRITABLE_GAP_STATUSES.includes(body.status as GapStatus)) {
      return reply.status(400).send(err("status must be OPEN, IN_PROGRESS, or RESOLVED"));
    }
    const nextStatus = body.status as GapStatus;

    const existing = await prisma.gap.findFirst({
      where: { id, orgId: org.id },
    });
    if (!existing) return reply.status(404).send(err("Gap not found"));

    const updated = await prisma.gap.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        resolvedAt: nextStatus === "RESOLVED" ? new Date() : null,
      },
      include: { control: true, repo: true, cloudAccount: true },
    });

    await logAuditEvent({
      orgId: org.id,
      actorId: member?.id,
      action: "gap.status_updated",
      target: updated.id,
      metadata: { from: existing.status, to: nextStatus, title: updated.title },
    });

    return reply.send(ok(mapGap(updated)));
  });
};

function sortGaps<T extends { severity: string; resolvedAt?: Date | null }>(
  gaps: T[],
  isResolved: boolean
): T[] {
  if (isResolved) {
    return [...gaps].sort((a, b) => {
      const ta = a.resolvedAt?.getTime() ?? 0;
      const tb = b.resolvedAt?.getTime() ?? 0;
      return tb - ta;
    });
  }
  return [...gaps].sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity as Severity] ?? 99) - (SEVERITY_RANK[b.severity as Severity] ?? 99)
  );
}

function mapGap(g: {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  filePath: string | null;
  lineNumber: number | null;
  codeSnippet: string | null;
  remediation: string;
  createdAt: Date;
  resolvedAt?: Date | null;
  control?: { code: string; title: string } | null;
  repo?: { fullName: string; name: string } | null;
  cloudAccount?: { accountName: string } | null;
  cloudProvider?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  region?: string | null;
  isSample?: boolean;
}) {
  return {
          id: g.id,
          title: g.title,
          description: g.description,
          severity: g.severity,
          status: g.status,
          source: g.source,
          filePath: g.filePath,
          lineNumber: g.lineNumber,
          codeSnippet: redactCodeSnippet(g.codeSnippet),
          remediation: g.remediation,
          controlCode: g.control?.code,
          controlTitle: g.control?.title,
          repoName: g.repo?.fullName ?? g.repo?.name,
          cloudProvider: g.cloudProvider,
          resourceType: g.resourceType,
          resourceId: g.resourceId,
          region: g.region,
          cloudAccountName: g.cloudAccount?.accountName,
          isSample: g.isSample ?? false,
          createdAt: g.createdAt.toISOString(),
          resolvedAt: g.resolvedAt?.toISOString() ?? null,
        };
}

