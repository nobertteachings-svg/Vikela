import { prisma } from "./prisma.js";
import type { Prisma } from "@prisma/client";

export async function logAuditEvent(params: {
  orgId: string;
  actorId?: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      orgId: params.orgId,
      actorId: params.actorId,
      action: params.action,
      target: params.target,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
