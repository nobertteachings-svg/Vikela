import type { FastifyPluginAsync } from "fastify";
import type { TrainingProgressStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { requireMutation, requireRead } from "../lib/authorization.js";
import {
  assignModuleToAllMembers,
  syncTrainingModuleStats,
} from "../services/training/sync-module-stats.js";

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    ON_TRACK: "On track",
    AT_RISK: "At risk",
    COMPLETE: "Complete",
    OVERDUE: "Overdue",
  };
  return map[status] ?? status;
}

function mapProgressStatus(status: string): string {
  const map: Record<string, string> = {
    NOT_STARTED: "Not started",
    IN_PROGRESS: "In progress",
    COMPLETE: "Complete",
    OVERDUE: "Overdue",
  };
  return map[status] ?? status;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export const trainingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/training", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const modules = await prisma.trainingModule.findMany({
      where: { orgId: org.id },
      orderBy: { dueAt: "asc" },
    });

    return reply.send(
      ok(
        modules.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          framework: m.framework,
          completed: m.completed,
          total: m.assigned,
          due: m.dueAt?.toISOString().slice(0, 10) ?? null,
          duration: `${m.durationMin} min`,
          status: mapStatus(m.status),
        }))
      )
    );
  });

  app.get("/training/progress", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const [members, assignments, modules] = await Promise.all([
      prisma.member.findMany({
        where: { orgId: org.id },
        orderBy: { name: "asc" },
      }),
      prisma.trainingAssignment.findMany({
        where: { orgId: org.id },
      }),
      prisma.trainingModule.findMany({
        where: { orgId: org.id },
      }),
    ]);

    const moduleCount = modules.length || 1;
    const progress = members.map((member) => {
      const memberAssignments = assignments.filter((a) => a.memberId === member.id);
      const completed = memberAssignments.filter((a) => a.status === "COMPLETE").length;
      const overdue = memberAssignments.filter((a) => a.status === "OVERDUE").length;
      const inProgress = memberAssignments.filter((a) => a.status === "IN_PROGRESS").length;
      const pct = Math.round((completed / moduleCount) * 100);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        completed,
        total: moduleCount,
        overdue,
        inProgress,
        progress: pct,
        status:
          overdue > 0
            ? "Overdue"
            : completed >= moduleCount
              ? "Complete"
              : inProgress > 0
                ? "In progress"
                : "Not started",
        assignments: memberAssignments.map((a) => ({
          id: a.id,
          moduleId: a.moduleId,
          status: mapProgressStatus(a.status),
          completedAt: a.completedAt?.toISOString() ?? null,
        })),
      };
    });

    return reply.send(ok(progress));
  });

  app.get("/training/export", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const [members, assignments, modules] = await Promise.all([
      prisma.member.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
      prisma.trainingAssignment.findMany({ where: { orgId: org.id } }),
      prisma.trainingModule.findMany({ where: { orgId: org.id } }),
    ]);

    const header = "Member,Email,Module,Status,Completed at";
    const rows: string[] = [];
    for (const member of members) {
      for (const mod of modules) {
        const a = assignments.find((x) => x.memberId === member.id && x.moduleId === mod.id);
        rows.push(
          [
            escapeCsv(member.name),
            escapeCsv(member.email),
            escapeCsv(mod.name),
            a?.status ?? "NOT_ASSIGNED",
            a?.completedAt?.toISOString() ?? "",
          ].join(",")
        );
      }
    }

    const csv = [header, ...rows].join("\n");
    const filename = `training-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(csv);
  });

  app.post("/training/modules", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const body = req.body as {
      name?: string;
      description?: string;
      framework?: string;
      durationMin?: number;
      dueAt?: string;
      assignToAll?: boolean;
    };

    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const mod = await prisma.trainingModule.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        framework: body.framework?.trim() || "SOC 2 CC1.4",
        durationMin: body.durationMin ?? 30,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        completed: 0,
        assigned: 0,
        status: "ON_TRACK",
      },
    });

    if (body.assignToAll !== false) {
      await assignModuleToAllMembers(org.id, mod.id);
    }

    const updated = await prisma.trainingModule.findUniqueOrThrow({ where: { id: mod.id } });

    return reply.send(
      ok({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        framework: updated.framework,
        completed: updated.completed,
        total: updated.assigned,
        due: updated.dueAt?.toISOString().slice(0, 10) ?? null,
        duration: `${updated.durationMin} min`,
        status: mapStatus(updated.status),
      })
    );
  });

  app.post("/training/modules/:id/assign", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const mod = await prisma.trainingModule.findFirst({ where: { id, orgId: org.id } });
    if (!mod) return reply.status(404).send(err("Module not found"));

    await assignModuleToAllMembers(org.id, id);
    const updated = await prisma.trainingModule.findUniqueOrThrow({ where: { id } });

    return reply.send(
      ok({
        id: updated.id,
        assigned: updated.assigned,
        completed: updated.completed,
        status: mapStatus(updated.status),
      })
    );
  });

  app.patch("/training/assignments/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const body = req.body as { status?: TrainingProgressStatus };

    const existing = await prisma.trainingAssignment.findFirst({
      where: { id, orgId: org.id },
    });
    if (!existing) return reply.status(404).send(err("Assignment not found"));

    const status = body.status ?? existing.status;
    const assignment = await prisma.trainingAssignment.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETE" ? new Date() : null,
      },
    });

    await syncTrainingModuleStats(org.id, assignment.moduleId);

    return reply.send(
      ok({
        id: assignment.id,
        moduleId: assignment.moduleId,
        memberId: assignment.memberId,
        status: mapProgressStatus(assignment.status),
        completedAt: assignment.completedAt?.toISOString() ?? null,
      })
    );
  });
};
