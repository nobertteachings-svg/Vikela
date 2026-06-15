import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/response.js";
import { resolveOrganization } from "../lib/org-context.js";
import { saveEvidenceFile, readEvidenceFile } from "../lib/storage.js";
import { getEvidenceCoverage } from "../services/evidence/coverage.js";
import { collectEvidenceFromGaps } from "../services/evidence/auto-collect.js";
import { ingestOrgKnowledge } from "../services/rag/ingest.js";
import { requireMutation, requireRead, requireExportRole } from "../lib/authorization.js";
import { getClerkAuth } from "../lib/auth.js";
import { parseAuditDateRange, optionalDateFilter } from "../lib/audit-date-range.js";
import { streamAuditEvidenceExport } from "../services/evidence/export-audit-package.js";
import { captureProductEvent } from "../lib/product-events.js";
import type { EvidenceSource, EvidenceType } from "@prisma/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function mapEvidence(e: {
  id: string;
  title: string;
  description: string | null;
  type: EvidenceType;
  source: EvidenceSource;
  fileUrl: string | null;
  mimeType: string | null;
  controlId: string | null;
  isAutoCollected: boolean;
  collectedAt: Date;
  expiresAt: Date | null;
  control?: { control: { code: string; title: string } } | null;
}) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    source: e.source,
    fileUrl: e.fileUrl,
    mimeType: e.mimeType,
    controlId: e.controlId,
    controlCode: e.control?.control.code,
    controlTitle: e.control?.control.title,
    isAutoCollected: e.isAutoCollected,
    collectedAt: e.collectedAt.toISOString(),
    expiresAt: e.expiresAt?.toISOString(),
  };
}

export const evidenceRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES } });

  app.get("/evidence/coverage", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const query = req.query as { from?: string; to?: string };
    return reply.send(ok(await getEvidenceCoverage(org.id, query)));
  });

  app.get("/evidence", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const query = req.query as { controlId?: string; type?: string; from?: string; to?: string };
    const collectedAt = optionalDateFilter(query.from, query.to);
    const items = await prisma.evidence.findMany({
      where: {
        orgId: org.id,
        ...(query.controlId ? { controlId: query.controlId } : {}),
        ...(query.type ? { type: query.type as EvidenceType } : {}),
        ...(collectedAt ? { collectedAt } : {}),
      },
      include: {
        control: { include: { control: { select: { code: true, title: true } } } },
      },
      orderBy: { collectedAt: "desc" },
    });

    return reply.send(ok(items.map(mapEvidence)));
  });

  app.post("/evidence/export", async (req, reply) => {
    let member;
    try {
      member = await requireExportRole(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = req.body as { from?: string; to?: string };
    let range;
    try {
      range = parseAuditDateRange(body.from, body.to);
    } catch (e) {
      return reply
        .status(400)
        .send(err(e instanceof Error ? e.message : "Invalid date range"));
    }

    const auth = getClerkAuth(req);
    const sessionClaims = auth?.sessionClaims as Record<string, unknown> | undefined;
    const exporterEmail =
      member?.email ??
      (typeof sessionClaims?.email === "string" ? sessionClaims.email : undefined) ??
      (typeof sessionClaims?.primary_email_address === "string"
        ? sessionClaims.primary_email_address
        : undefined) ??
      "unknown@vikela.local";

    if (auth?.userId) {
      captureProductEvent(
        "audit_export_downloaded",
        {
          orgId: org.id,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        { distinctId: auth.userId, orgId: org.id }
      );
    }

    await streamAuditEvidenceExport(req, reply, {
      orgId: org.id,
      orgName: org.name,
      range,
      exporter: {
        email: exporterEmail,
        role: member?.role ?? "AUDITOR",
      },
    });
  });

  app.get("/evidence/org-controls", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.send(ok([]));

    const orgControls = await prisma.orgControl.findMany({
      where: { orgId: org.id },
      include: { control: { select: { code: true, title: true } } },
      orderBy: { control: { code: "asc" } },
    });

    return reply.send(
      ok(
        orgControls.map((oc) => ({
          id: oc.id,
          code: oc.control.code,
          title: oc.control.title,
          status: oc.status,
        }))
      )
    );
  });

  app.get("/evidence/:id", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const item = await prisma.evidence.findFirst({
      where: { id, orgId: org.id },
      include: { control: { include: { control: true } } },
    });
    if (!item) return reply.status(404).send(err("Evidence not found"));
    return reply.send(ok(mapEvidence(item)));
  });

  app.post("/evidence/collect-from-gaps", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const result = await collectEvidenceFromGaps(org.id);
    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok(result));
  });

  app.post("/evidence", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const parts = req.parts();
    let title = "Uploaded evidence";
    let description: string | undefined;
    let type: EvidenceType = "OTHER";
    let controlId: string | undefined;
    let buffer: Buffer | null = null;
    let filename = "upload.bin";
    let mimeType: string | undefined;

    for await (const part of parts) {
      if (part.type === "file") {
        filename = part.filename;
        mimeType = part.mimetype;
        buffer = await part.toBuffer();
        if (buffer.length > MAX_FILE_BYTES) {
          return reply.status(413).send(err("File exceeds 10MB limit"));
        }
      } else {
        const value = (part as { value: string }).value;
        if (part.fieldname === "title") title = value;
        if (part.fieldname === "description") description = value;
        if (part.fieldname === "type") type = value as EvidenceType;
        if (part.fieldname === "controlId") controlId = value || undefined;
      }
    }

    let fileKey: string | undefined;
    let storedMime = mimeType;
    if (buffer && buffer.length > 0) {
      const saved = await saveEvidenceFile(org.id, filename, buffer);
      fileKey = saved.fileKey;
      storedMime = saved.mimeType;
    }

    const evidence = await prisma.evidence.create({
      data: {
        orgId: org.id,
        title,
        description,
        type,
        source: "MANUAL",
        fileKey,
        mimeType: storedMime,
        controlId: controlId || undefined,
      },
    });

    if (fileKey) {
      await prisma.evidence.update({
        where: { id: evidence.id },
        data: { fileUrl: `/api/v1/evidence/${evidence.id}/file` },
      });
    }

    ingestOrgKnowledge(org.id).catch(() => {});

    return reply.send(
      ok({
        id: evidence.id,
        fileUrl: fileKey ? `/api/v1/evidence/${evidence.id}/file` : null,
      })
    );
  });

  app.post("/evidence/metadata", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));

    const body = req.body as {
      title: string;
      description?: string;
      type?: EvidenceType;
      controlId?: string;
      content?: string;
    };

    const evidence = await prisma.evidence.create({
      data: {
        orgId: org.id,
        title: body.title,
        description: body.description ?? body.content?.slice(0, 500),
        type: body.type ?? "OTHER",
        source: "MANUAL",
        controlId: body.controlId,
      },
    });

    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok({ id: evidence.id }));
  });

  app.patch("/evidence/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const existing = await prisma.evidence.findFirst({ where: { id, orgId: org.id } });
    if (!existing) return reply.status(404).send(err("Evidence not found"));

    const body = req.body as {
      title?: string;
      description?: string;
      controlId?: string | null;
      type?: EvidenceType;
    };

    const updated = await prisma.evidence.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.controlId !== undefined ? { controlId: body.controlId || null } : {}),
        ...(body.type ? { type: body.type } : {}),
      },
      include: { control: { include: { control: { select: { code: true, title: true } } } } },
    });

    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok(mapEvidence(updated)));
  });

  app.get("/evidence/:id/file", async (req, reply) => {
    await requireRead(req);
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };
    const evidence = await prisma.evidence.findFirst({
      where: { id, orgId: org.id },
    });
    if (!evidence?.fileKey) {
      return reply.status(404).send(err("File not found"));
    }

    try {
      const data = await readEvidenceFile(evidence.fileKey);
      return reply
        .header("Content-Type", evidence.mimeType ?? "application/octet-stream")
        .header("Content-Disposition", `inline; filename="${evidence.title}"`)
        .send(data);
    } catch {
      return reply.status(404).send(err("File missing on disk"));
    }
  });

  app.delete("/evidence/:id", async (req, reply) => {
    try {
      await requireMutation(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }
    const org = await resolveOrganization(req);
    if (!org) return reply.status(404).send(err("Organization not found"));
    const { id } = req.params as { id: string };

    const deleted = await prisma.evidence.deleteMany({ where: { id, orgId: org.id } });
    if (deleted.count === 0) {
      return reply.status(404).send(err("Evidence not found"));
    }
    ingestOrgKnowledge(org.id).catch(() => {});
    return reply.send(ok({ deleted: true }));
  });
};
