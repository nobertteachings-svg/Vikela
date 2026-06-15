import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export type ApiKeyAuthContext = {
  orgId: string;
  apiKeyId: string;
};

declare module "fastify" {
  interface FastifyRequest {
    apiKeyAuth?: ApiKeyAuthContext;
  }
}

function extractBearerKey(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return undefined;
  const key = value.slice(7).trim();
  if (!key.startsWith("vk_")) return undefined;
  return key;
}

/** Authenticate org API key (vk_*). Returns org context or null. */
export async function authenticateApiKey(
  req: FastifyRequest
): Promise<ApiKeyAuthContext | null> {
  const rawKey = extractBearerKey(req);
  if (!rawKey) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const record = await prisma.apiKey.findFirst({
    where: { keyHash },
  });
  if (!record) return null;

  await prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { orgId: record.orgId, apiKeyId: record.id };
}
