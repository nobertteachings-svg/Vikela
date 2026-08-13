import type { FastifyPluginAsync } from "fastify";
import type { TrainingProgressStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { requireOrganization } from "../lib/org-context.js";
import { isAuthEnforced } from "../lib/auth.js";
import {
  getMemberForRequest,
  requireExportRole,
  requireMutation,
  requireRead,
} from "../lib/authorization.js";
import { getAppUrl } from "../lib/app-url.js";
import { sendTrainingReminderEmail } from "../lib/email.js";
import {
  assignModuleToAllMembers,
  assignModuleToMembers,
  refreshOverdueAssignments,
  syncTrainingModuleStats,
} from "../services/training/sync-module-stats.js";
import { getCatalogCourse, gradeQuiz } from "../services/training/course-catalog.js";
import { syncCatalogCoursesForOrg } from "../services/training/sync-catalog.js";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializeModule(m: {
  id: string;
  name: string;
  description: string;
  framework: string | null;
  contentKey?: string | null;
  completed: number;
  assigned: number;
  dueAt: Date | null;
  durationMin: number;
  status: string;
}) {
  const contentKey = m.contentKey ?? null;
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    framework: m.framework,
    contentKey,
    hasCourse: Boolean(contentKey && getCatalogCourse(contentKey)),
    lessonCount: contentKey ? (getCatalogCourse(contentKey)?.lessons.length ?? 0) : 0,
    completed: m.completed,
    total: m.assigned,
    due: m.dueAt?.toISOString().slice(0, 10) ?? null,
    durationMin: m.durationMin,
    duration: `${m.durationMin} min`,
    status: mapStatus(m.status),
  };
}

const ALLOWED_ASSIGNMENT_STATUSES: TrainingProgressStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "OVERDUE",
];

export const trainingRoutes: FastifyPluginAsync = async (app) => {
  app.post("/training/catalog/sync", async (req, reply) => {
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

    const result = await syncCatalogCoursesForOrg(org.id);
    await refreshOverdueAssignments(org.id);
    const modules = await prisma.trainingModule.findMany({
      where: { orgId: org.id },
      orderBy: { dueAt: "asc" },
    });

    return reply.send(
      ok({
        ...result,
        modules: modules.map(serializeModule),
      })
    );
  });

  app.get("/training", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    // Keep the built-in curriculum present for every org.
    await syncCatalogCoursesForOrg(org.id);
    await refreshOverdueAssignments(org.id);

    const modules = await prisma.trainingModule.findMany({
      where: { orgId: org.id },
      orderBy: { dueAt: "asc" },
    });

    return reply.send(ok(modules.map(serializeModule)));
  });

  app.get("/training/progress", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    await syncCatalogCoursesForOrg(org.id);
    await refreshOverdueAssignments(org.id);

    const [members, assignments, modules, me] = await Promise.all([
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
      getMemberForRequest(req),
    ]);

    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const progress = members.map((member) => {
      const memberAssignments = assignments.filter((a) => a.memberId === member.id);
      const total = memberAssignments.length;
      const completed = memberAssignments.filter((a) => a.status === "COMPLETE").length;
      const overdue = memberAssignments.filter((a) => a.status === "OVERDUE").length;
      const inProgress = memberAssignments.filter((a) => a.status === "IN_PROGRESS").length;
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        completed,
        total,
        overdue,
        inProgress,
        progress: pct,
        status:
          overdue > 0
            ? "Overdue"
            : total > 0 && completed >= total
              ? "Complete"
              : inProgress > 0
                ? "In progress"
                : total === 0
                  ? "Unassigned"
                  : "Not started",
        assignments: memberAssignments.map((a) => ({
          id: a.id,
          moduleId: a.moduleId,
          moduleName: moduleById.get(a.moduleId)?.name ?? "Module",
          status: mapProgressStatus(a.status),
          completedAt: a.completedAt?.toISOString() ?? null,
          due: moduleById.get(a.moduleId)?.dueAt?.toISOString().slice(0, 10) ?? null,
        })),
      };
    });

    return reply.send(
      ok({
        currentMemberId: me?.id ?? null,
        members: progress,
      })
    );
  });

  app.get("/training/mine", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    await syncCatalogCoursesForOrg(org.id);
    await refreshOverdueAssignments(org.id);

    const me = await getMemberForRequest(req);
    if (!me) {
      // Dev / internal secret without a user, return empty personal queue.
      return reply.send(ok({ memberId: null, assignments: [] }));
    }

    const assignments = await prisma.trainingAssignment.findMany({
      where: { orgId: org.id, memberId: me.id },
      include: {
        module: {
          select: {
            id: true,
            name: true,
            description: true,
            framework: true,
            contentKey: true,
            durationMin: true,
            dueAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return reply.send(
      ok({
        memberId: me.id,
        assignments: assignments.map((a) => {
          const contentKey = a.module.contentKey ?? null;
          return {
            id: a.id,
            status: mapProgressStatus(a.status),
            completedAt: a.completedAt?.toISOString() ?? null,
            module: {
              id: a.module.id,
              name: a.module.name,
              description: a.module.description,
              framework: a.module.framework,
              contentKey,
              hasCourse: Boolean(contentKey && getCatalogCourse(contentKey)),
              lessonCount: contentKey
                ? (getCatalogCourse(contentKey)?.lessons.length ?? 0)
                : 0,
              duration: `${a.module.durationMin} min`,
              due: a.module.dueAt?.toISOString().slice(0, 10) ?? null,
            },
          };
        }),
      })
    );
  });

  app.get("/training/modules/:id/course", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { id } = req.params as { id: string };
    const mod = await prisma.trainingModule.findFirst({ where: { id, orgId: org.id } });
    if (!mod) return reply.status(404).send(err("Module not found"));
    if (!mod.contentKey) {
      return reply.status(404).send(err("This module has no interactive course content"));
    }
    const course = getCatalogCourse(mod.contentKey);
    if (!course) {
      return reply.status(404).send(err("Course content not found"));
    }

    return reply.send(
      ok({
        moduleId: mod.id,
        contentKey: course.key,
        name: course.name,
        description: course.description,
        framework: course.framework,
        durationMin: course.durationMin,
        acknowledgment: course.acknowledgment,
        lessons: course.lessons,
        quiz: course.quiz.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          choices: q.choices,
        })),
        passRule:
          course.quiz.length <= 2
            ? "Answer every question correctly to finish."
            : "You may miss at most one question to finish.",
      })
    );
  });

  app.post("/training/assignments/:id/submit", async (req, reply) => {
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
    const body = (req.body as {
      answers?: Record<string, number>;
      acknowledged?: boolean;
    }) ?? {};

    const assignment = await prisma.trainingAssignment.findFirst({
      where: { id, orgId: org.id },
      include: { module: true },
    });
    if (!assignment) return reply.status(404).send(err("Assignment not found"));

    const me = await getMemberForRequest(req);
    if (me) {
      const isAdmin = me.role === "OWNER" || me.role === "ADMIN";
      if (!isAdmin && me.id !== assignment.memberId) {
        return reply.status(403).send(err("You can only submit your own training"));
      }
    }

    if (!assignment.module.contentKey) {
      return reply.status(400).send(err("This module has no course to submit"));
    }
    const course = getCatalogCourse(assignment.module.contentKey);
    if (!course) return reply.status(400).send(err("Course content not found"));

    if (!body.acknowledged) {
      return reply.status(400).send(err("You must acknowledge the course attestation"));
    }

    const grade = gradeQuiz(course, body.answers ?? {});
    if (!grade.passed) {
      await prisma.trainingAssignment.update({
        where: { id },
        data: { status: "IN_PROGRESS", completedAt: null },
      });
      await syncTrainingModuleStats(org.id, assignment.moduleId);
      return reply.status(400).send(
        err(
          `Quiz not passed (${grade.score}/${grade.total}). Review the lessons and try again.`
        )
      );
    }

    const updated = await prisma.trainingAssignment.update({
      where: { id },
      data: { status: "COMPLETE", completedAt: new Date() },
    });
    await syncTrainingModuleStats(org.id, assignment.moduleId);

    return reply.send(
      ok({
        id: updated.id,
        status: mapProgressStatus(updated.status),
        completedAt: updated.completedAt?.toISOString() ?? null,
        score: grade.score,
        total: grade.total,
        passed: true,
      })
    );
  });

  app.get("/training/export", async (req, reply) => {
    try {
      await requireExportRole(req);
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

    await refreshOverdueAssignments(org.id);

    const [members, assignments, modules] = await Promise.all([
      prisma.member.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
      prisma.trainingAssignment.findMany({ where: { orgId: org.id } }),
      prisma.trainingModule.findMany({ where: { orgId: org.id } }),
    ]);

    const header =
      "Member,Email,Role,Module,Framework,Status,Due,Completed at,Duration (min)";
    const rows: string[] = [];
    for (const member of members) {
      for (const mod of modules) {
        const a = assignments.find((x) => x.memberId === member.id && x.moduleId === mod.id);
        rows.push(
          [
            escapeCsv(member.name),
            escapeCsv(member.email),
            escapeCsv(member.role),
            escapeCsv(mod.name),
            escapeCsv(mod.framework ?? ""),
            a?.status ?? "NOT_ASSIGNED",
            mod.dueAt?.toISOString().slice(0, 10) ?? "",
            a?.completedAt?.toISOString() ?? "",
            String(mod.durationMin),
          ].join(",")
        );
      }
    }

    const csv = [header, ...rows].join("\n");
    const filename = `training-report-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(csv);
  });

  app.get("/training/certificates/:assignmentId", async (req, reply) => {
    await requireRead(req);
    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply.status(404).send(err("Organization not found"));
    }

    const { assignmentId } = req.params as { assignmentId: string };
    const assignment = await prisma.trainingAssignment.findFirst({
      where: { id: assignmentId, orgId: org.id },
      include: {
        member: true,
        module: true,
      },
    });
    if (!assignment) return reply.status(404).send(err("Assignment not found"));
    if (assignment.status !== "COMPLETE" || !assignment.completedAt) {
      return reply.status(400).send(err("Certificate available only for completed training"));
    }

    const me = await getMemberForRequest(req);
    if (isAuthEnforced() && me) {
      const canViewOthers =
        me.role === "OWNER" || me.role === "ADMIN" || me.role === "AUDITOR";
      if (me.id !== assignment.memberId && !canViewOthers) {
        return reply.status(403).send(err("Forbidden"));
      }
    }

    const completed = assignment.completedAt.toISOString().slice(0, 10);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Training certificate, ${escapeHtml(assignment.module.name)}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; max-width: 720px; margin: 48px auto; padding: 24px; border: 2px solid #222; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .muted { color: #555; font-size: 14px; }
    .meta { margin-top: 32px; font-size: 15px; line-height: 1.6; }
    .footer { margin-top: 48px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <p class="muted">Vikela · Security awareness training</p>
  <h1>Certificate of completion</h1>
  <p>This certifies that <strong>${escapeHtml(assignment.member.name)}</strong>
  (${escapeHtml(assignment.member.email)}) completed the following training for
  <strong>${escapeHtml(org.name)}</strong>.</p>
  <div class="meta">
    <div><strong>Module:</strong> ${escapeHtml(assignment.module.name)}</div>
    <div><strong>Framework:</strong> ${escapeHtml(assignment.module.framework ?? "General")}</div>
    <div><strong>Completed:</strong> ${escapeHtml(completed)}</div>
    <div><strong>Duration:</strong> ${assignment.module.durationMin} minutes</div>
    <div><strong>Assignment ID:</strong> ${escapeHtml(assignment.id)}</div>
  </div>
  <p class="footer">Generated ${new Date().toISOString()} · Retain for SOC 2 CC1.4 / workforce security awareness evidence.</p>
</body>
</html>`;

    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .header(
        "Content-Disposition",
        `inline; filename="training-certificate-${assignment.id}.html"`
      )
      .send(html);
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
      memberIds?: string[];
    };

    if (!body.name?.trim()) {
      return reply.status(400).send(err("name is required"));
    }

    const durationMin =
      typeof body.durationMin === "number" && body.durationMin > 0
        ? Math.min(480, Math.round(body.durationMin))
        : 30;

    const mod = await prisma.trainingModule.create({
      data: {
        orgId: org.id,
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        framework: body.framework?.trim() || "SOC 2 CC1.4",
        durationMin,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        completed: 0,
        assigned: 0,
        status: "ON_TRACK",
      },
    });

    if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
      await assignModuleToMembers(org.id, mod.id, body.memberIds);
    } else if (body.assignToAll !== false) {
      await assignModuleToAllMembers(org.id, mod.id);
    }

    const updated = await prisma.trainingModule.findUniqueOrThrow({ where: { id: mod.id } });
    return reply.send(ok(serializeModule(updated)));
  });

  app.patch("/training/modules/:id", async (req, reply) => {
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
    const existing = await prisma.trainingModule.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Module not found"));

    const body = req.body as {
      name?: string;
      description?: string;
      framework?: string | null;
      durationMin?: number;
      dueAt?: string | null;
    };

    await prisma.trainingModule.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.framework !== undefined
          ? { framework: body.framework?.trim() || null }
          : {}),
        ...(typeof body.durationMin === "number" && body.durationMin > 0
          ? { durationMin: Math.min(480, Math.round(body.durationMin)) }
          : {}),
        ...(body.dueAt !== undefined
          ? { dueAt: body.dueAt ? new Date(body.dueAt) : null }
          : {}),
      },
    });

    await refreshOverdueAssignments(org.id);
    await syncTrainingModuleStats(org.id, id);
    const synced = await prisma.trainingModule.findUniqueOrThrow({ where: { id } });
    return reply.send(ok(serializeModule(synced)));
  });

  app.delete("/training/modules/:id", async (req, reply) => {
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
    const existing = await prisma.trainingModule.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Module not found"));

    await prisma.trainingAssignment.deleteMany({ where: { orgId: org.id, moduleId: id } });
    await prisma.trainingModule.delete({ where: { id } });
    return reply.send(ok({ deleted: true, id }));
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

    const body = (req.body as { memberIds?: string[]; all?: boolean }) ?? {};
    let result: { created: number };
    if (Array.isArray(body.memberIds) && body.memberIds.length > 0) {
      result = await assignModuleToMembers(org.id, id, body.memberIds);
    } else {
      result = await assignModuleToAllMembers(org.id, id);
    }

    const updated = await prisma.trainingModule.findUniqueOrThrow({ where: { id } });
    return reply.send(
      ok({
        ...serializeModule(updated),
        created: result.created,
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
    const body = req.body as { status?: TrainingProgressStatus; force?: boolean };
    const existing = await prisma.trainingAssignment.findFirst({
      where: { id, orgId: org.id },
    });
    if (!existing) return reply.status(404).send(err("Assignment not found"));

    const me = await getMemberForRequest(req);
    const isAdmin = Boolean(me && (me.role === "OWNER" || me.role === "ADMIN"));
    if (me) {
      if (!isAdmin && me.id !== existing.memberId) {
        return reply.status(403).send(err("You can only update your own training assignments"));
      }
      if (!isAdmin && body.status && body.status !== "COMPLETE" && body.status !== "IN_PROGRESS") {
        return reply.status(403).send(err("Members may only start or complete their training"));
      }
    }

    const status = body.status ?? existing.status;
    if (!ALLOWED_ASSIGNMENT_STATUSES.includes(status)) {
      return reply.status(400).send(err("Invalid status"));
    }

    // Interactive catalog courses must be completed via /submit (quiz + acknowledgment).
    // Admins may pass force:true for evidence corrections. Dev/service callers without a
    // member context may complete directly (smoke tests / internal tooling).
    if (status === "COMPLETE") {
      const mod = await prisma.trainingModule.findUnique({ where: { id: existing.moduleId } });
      const canBypassCourse = (isAdmin && body.force) || !me;
      if (mod?.contentKey && getCatalogCourse(mod.contentKey) && !canBypassCourse) {
        return reply
          .status(400)
          .send(err("Open the course and complete the lessons and quiz to finish this module"));
      }
    }

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

  app.post("/training/reminders", async (req, reply) => {
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

    await refreshOverdueAssignments(org.id);

    const overdue = await prisma.trainingAssignment.findMany({
      where: {
        orgId: org.id,
        OR: [
          { status: "OVERDUE" },
          { status: { not: "COMPLETE" }, module: { dueAt: { lt: new Date() } } },
        ],
      },
      include: {
        member: { select: { id: true, email: true, name: true } },
        module: { select: { name: true, dueAt: true } },
      },
      take: 200,
    });

    const recipients = new Map<string, { email: string; name: string; modules: string[] }>();
    for (const row of overdue) {
      const existing = recipients.get(row.member.id);
      if (existing) {
        if (!existing.modules.includes(row.module.name)) {
          existing.modules.push(row.module.name);
        }
      } else {
        recipients.set(row.member.id, {
          email: row.member.email,
          name: row.member.name,
          modules: [row.module.name],
        });
      }
    }

    const trainingUrl = `${getAppUrl()}/training`;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of recipients.values()) {
      const result = await sendTrainingReminderEmail({
        to: recipient.email,
        name: recipient.name,
        orgName: org.name,
        modules: recipient.modules,
        trainingUrl,
      });
      if (result.sent) {
        sent += 1;
      } else {
        failed += 1;
        if (result.error && errors.length < 5) {
          errors.push(result.error);
        }
      }
    }

    return reply.send(
      ok({
        recipients: recipients.size,
        assignmentCount: overdue.length,
        sent,
        failed,
        emailConfigured: Boolean(process.env.RESEND_API_KEY),
        errors,
        people: [...recipients.values()].map((r) => ({
          email: r.email,
          name: r.name,
          moduleCount: r.modules.length,
        })),
      })
    );
  });
};
