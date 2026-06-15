import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { requireRead } from "../lib/authorization.js";
import { computeFrameworkScoresForOrg, computeControlsMet, computeControlsMetForFramework } from "../lib/framework-score.js";
import { gapsFoundForScan } from "../lib/scan-query.js";
import type { DashboardStats, GapSource, Severity } from "@vikela/shared";

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

function sortBySeverity<T extends { severity: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (SEVERITY_RANK[a.severity as Severity] ?? 99) - (SEVERITY_RANK[b.severity as Severity] ?? 99)
  );
}

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/dashboard", async (req, reply) => {
    await requireRead(req);
    const resolved = await resolveOrganization(req);
    if (!resolved) {
      return reply.send(err("No organization found. Run db:seed first."));
    }
    const org = await prisma.organization.findFirst({
      where: { id: resolved.id },
      include: {
        frameworks: { include: { framework: true } },
        integrations: { where: { isActive: true } },
        cloudAccounts: true,
        gaps: {
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { control: true },
        },
      },
    });

    if (!org) {
      return reply.send(err("No organization found. Run db:seed first."));
    }

    const severityCounts = await prisma.gap.groupBy({
      by: ["severity"],
      where: { orgId: org.id, status: "OPEN" },
      _count: true,
    });

    const sourceCounts = await prisma.gap.groupBy({
      by: ["source"],
      where: { orgId: org.id, status: "OPEN" },
      _count: true,
    });

    const gapsBySeverity: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    for (const row of severityCounts) {
      gapsBySeverity[row.severity as Severity] = row._count;
    }

    const gapsBySource: Record<GapSource, number> = {
      CODE: 0,
      IAM: 0,
      NETWORK: 0,
      ENCRYPTION: 0,
      LOGGING: 0,
      BACKUP: 0,
      MONITORING: 0,
    };
    for (const row of sourceCounts) {
      gapsBySource[row.source as GapSource] = row._count;
    }

    const recentScans = await prisma.scan.findMany({
      where: { orgId: org.id },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        repo: true,
        cloudAccount: true,
        _count: { select: { gaps: true } },
        children: {
          select: { _count: { select: { gaps: true } } },
        },
      },
    });

    const latestScan = recentScans.find((s) => s.status === "COMPLETED" && s.score != null);
    const latestLiteScan = recentScans.find((s) => s.status === "COMPLETED" && s.isLiteScan);

    const sampleGapCount = await prisma.gap.count({
      where: { orgId: org.id, status: "OPEN", isSample: true },
    });
    const realGapCount = await prisma.gap.count({
      where: { orgId: org.id, status: "OPEN", isSample: false },
    });

    let liteScanSource: "repo" | "sample" | "mixed" | null = null;
    if (latestLiteScan && sampleGapCount > 0 && realGapCount > 0) liteScanSource = "mixed";
    else if (latestLiteScan && sampleGapCount > 0) liteScanSource = "sample";
    else if (latestLiteScan) liteScanSource = "repo";

    const enrolledFrameworkIds = org.frameworks.map((f) => f.frameworkId);
    const frameworkScores = await computeFrameworkScoresForOrg(org.id, enrolledFrameworkIds);

    const postureScore =
      latestScan?.score ??
      (enrolledFrameworkIds.length > 0
        ? Math.round(
            enrolledFrameworkIds.reduce((sum, id) => sum + (frameworkScores.get(id) ?? 0), 0) /
              enrolledFrameworkIds.length
          )
        : 0);

    const { controlsTotal, controlsImplemented } = await computeControlsMet(org.id);

    const frameworkStats = await Promise.all(
      org.frameworks.map(async (of) => {
        const perFw = await computeControlsMetForFramework(org.id, of.frameworkId);
        return {
          id: of.framework.id,
          name: of.framework.name,
          slug: of.framework.slug,
          score: frameworkScores.get(of.frameworkId) ?? 0,
          status: of.status,
          controlsTotal: perFw.controlsTotal,
          controlsImplemented: perFw.controlsImplemented,
        };
      })
    );

    const completedForTrend = await prisma.scan.findMany({
      where: { orgId: org.id, status: "COMPLETED", score: { not: null } },
      orderBy: { completedAt: "asc" },
      take: 30,
      select: { completedAt: true, score: true },
    });

    const stats: DashboardStats = {
      postureScore,
      controlsTotal,
      controlsImplemented,
      frameworks: frameworkStats,
      criticalGaps: sortBySeverity(org.gaps).slice(0, 10).map((g) => ({
        id: g.id,
        title: g.title,
        severity: g.severity,
        status: g.status,
        source: g.source,
        filePath: g.filePath,
        lineNumber: g.lineNumber,
        controlCode: g.control?.code ?? null,
        cloudProvider: g.cloudProvider,
        resourceType: g.resourceType,
        resourceId: g.resourceId,
        region: g.region,
        isSample: g.isSample,
        createdAt: g.createdAt.toISOString(),
      })),
      scoreTrend: buildScoreTrend(completedForTrend, postureScore),
      gapsBySeverity,
      gapsBySource,
      recentScans: recentScans.map((s) => ({
        id: s.id,
        scanType: s.scanType,
        status: s.status,
        score: s.score,
        target: s.repo?.fullName ?? s.cloudAccount?.accountName ?? null,
        gapsFound: gapsFoundForScan(s),
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      cloudAccounts: await Promise.all(
        org.cloudAccounts.map(async (ca) => ({
          id: ca.id,
          provider: ca.provider,
          accountName: ca.accountName,
          accountId: ca.accountId,
          gapCount: await prisma.gap.count({
            where: { cloudAccountId: ca.id, status: "OPEN" },
          }),
          lastScannedAt: ca.lastScannedAt?.toISOString() ?? null,
        }))
      ),
      connectedIntegrations: org.integrations.length,
      hasSampleGaps: sampleGapCount > 0,
      liteScanSource,
    };

    return reply.send(ok(stats));
  });
};

function buildScoreTrend(
  scans: { completedAt: Date | null; score: number | null }[],
  currentScore: number
): { date: string; score: number }[] {
  if (scans.length === 0) {
    const now = new Date();
    return [{ date: now.toISOString().split("T")[0], score: currentScore }];
  }

  const byDay = new Map<string, number>();
  for (const s of scans) {
    if (!s.completedAt || s.score == null) continue;
    const date = s.completedAt.toISOString().split("T")[0];
    byDay.set(date, s.score);
  }

  const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 1) {
    return sorted.map(([date, score]) => ({ date, score }));
  }
  return sorted.slice(-30).map(([date, score]) => ({ date, score }));
}
