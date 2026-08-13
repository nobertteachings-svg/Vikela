import type { FastifyPluginAsync } from "fastify";
import {
  getClerkAuth,
  isAuthEnforced,
  isPublicApiPath,
  requireApiAuth,
  verifyInternalApiSecret,
} from "../lib/auth.js";
import { authenticateApiKey } from "../lib/api-key-auth.js";
import {
  hasActiveMembership,
  isMembershipBootstrapPath,
} from "../lib/membership.js";
import { prisma } from "../lib/prisma.js";
import { parseOrgSettings } from "../lib/org-settings.js";
import { isIpAllowed } from "../lib/ip-allowlist.js";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function enforceApiKeyIpAllowlist(
  orgId: string,
  clientIp: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  });
  if (!org) return true;

  const allowlist = parseOrgSettings(org.settings).security.ipAllowlist;
  if (allowlist.length === 0) return true;

  return isIpAllowed(clientIp, allowlist);
}

export const authGuardPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", async (req, reply) => {
    if (!isAuthEnforced()) return;
    if (isPublicApiPath(req.url)) return;
    if (!req.url.startsWith("/api/v1")) return;

    const apiKey = await authenticateApiKey(req);
    if (apiKey) {
      const allowed = await enforceApiKeyIpAllowlist(apiKey.orgId, req.ip);
      if (!allowed) {
        return reply.status(403).send({
          data: null,
          error: "IP not allowed",
        });
      }
      req.apiKeyAuth = apiKey;
      return;
    }

    if (verifyInternalApiSecret(req)) {
      const hasUser = Boolean(getClerkAuth(req)?.userId);
      if (
        process.env.NODE_ENV === "production" &&
        MUTATION_METHODS.has(req.method) &&
        !hasUser
      ) {
        return reply.status(403).send({
          data: null,
          error: "Internal service auth cannot perform write operations without a user session",
        });
      }
      return;
    }

    try {
      requireApiAuth(req);
    } catch {
      return reply.status(401).send({
        data: null,
        error: "Unauthorized, sign in, use an API key (Bearer vk_...), or select an organization",
      });
    }

    const auth = getClerkAuth(req);
    if (
      auth?.userId &&
      auth.orgId &&
      !req.apiKeyAuth &&
      !isMembershipBootstrapPath(req.url)
    ) {
      const isMember = await hasActiveMembership(req);
      if (!isMember) {
        return reply.status(403).send({
          data: null,
          error: "You are not a member of this organization",
        });
      }
    }
  });
};
