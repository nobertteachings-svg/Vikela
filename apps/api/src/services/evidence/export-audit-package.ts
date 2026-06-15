import type { FastifyReply, FastifyRequest } from "fastify";
import archiver from "archiver";
import type { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { openEvidenceFileStream } from "../../lib/storage.js";
import type { AuditDateRange } from "../../lib/audit-date-range.js";

function safeControlPath(code: string): string {
  return code.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function exportFileName(evidence: { id: string; fileKey: string | null; title: string }): string {
  const tail = evidence.fileKey?.split("/").pop() ?? evidence.title;
  const dash = tail.indexOf("-");
  const base = dash >= 0 ? tail.slice(dash + 1) : tail;
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
  return `${evidence.id}-${safe}`;
}

type ExportContext = {
  orgId: string;
  orgName: string;
  range: AuditDateRange;
  exporter: { email: string; role: Role | string };
};

export async function streamAuditEvidenceExport(
  req: FastifyRequest,
  reply: FastifyReply,
  ctx: ExportContext
): Promise<void> {
  const { orgId, orgName, range, exporter } = ctx;

  const evidenceItems = await prisma.evidence.findMany({
    where: {
      orgId,
      collectedAt: { gte: range.from, lte: range.to },
    },
    include: {
      control: { include: { control: { select: { code: true, title: true, category: true } } } },
    },
    orderBy: { collectedAt: "asc" },
  });

  const gapCount = await prisma.gap.count({
    where: {
      orgId,
      createdAt: { gte: range.from, lte: range.to },
    },
  });

  const byControl = new Map<
    string,
    {
      code: string;
      title: string;
      category: string | null;
      status: string;
      evidence: typeof evidenceItems;
    }
  >();

  for (const item of evidenceItems) {
    const code = item.control?.control.code ?? "unlinked";
    const title = item.control?.control.title ?? "Unlinked evidence";
    const category = item.control?.control.category ?? null;
    const status = item.control?.status ?? "UNKNOWN";
    const bucket = byControl.get(code) ?? {
      code,
      title,
      category,
      status,
      evidence: [],
    };
    bucket.evidence.push(item);
    byControl.set(code, bucket);
  }

  const manifest = {
    orgName,
    exportedBy: {
      email: exporter.email,
      role: exporter.role,
    },
    period: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      fromLabel: range.fromLabel,
      toLabel: range.toLabel,
    },
    exportedAt: new Date().toISOString(),
    summary: {
      evidenceCount: evidenceItems.length,
      fileCount: evidenceItems.filter((e) => e.fileKey).length,
      controlCount: byControl.size,
      gapCount,
    },
    controls: [...byControl.values()].map((c) => ({
      code: c.code,
      title: c.title,
      evidenceCount: c.evidence.length,
    })),
  };

  reply.hijack();
  reply.raw.setHeader("Content-Type", "application/zip");
  reply.raw.setHeader(
    "Content-Disposition",
    `attachment; filename="audit-${range.fromLabel}-${range.toLabel}.zip"`
  );
  reply.raw.setHeader("Transfer-Encoding", "chunked");

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err: Error) => {
    req.log.error({ err }, "export_zip_error");
    reply.raw.destroy(err);
  });

  archive.pipe(reply.raw);

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  for (const control of byControl.values()) {
    const payload = {
      controlCode: control.code,
      controlTitle: control.title,
      category: control.category,
      controlStatus: control.status,
      evidence: control.evidence.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        type: e.type,
        source: e.source,
        mimeType: e.mimeType,
        isAutoCollected: e.isAutoCollected,
        collectedAt: e.collectedAt.toISOString(),
        expiresAt: e.expiresAt?.toISOString() ?? null,
        hasFile: Boolean(e.fileKey),
        exportFile: e.fileKey ? `files/${exportFileName(e)}` : null,
      })),
    };
    archive.append(JSON.stringify(payload, null, 2), {
      name: `controls/${safeControlPath(control.code)}.json`,
    });
  }

  for (const item of evidenceItems) {
    if (!item.fileKey) continue;
    try {
      const stream = await openEvidenceFileStream(item.fileKey);
      archive.append(stream, { name: `files/${exportFileName(item)}` });
    } catch (err) {
      req.log.warn({ err, evidenceId: item.id, fileKey: item.fileKey }, "export_file_skip");
    }
  }

  await archive.finalize();
}
