import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!url) throw new Error("Grafana URL required");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid Grafana URL");
  }

  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) {
    throw new Error("Grafana URL must use https:// (or http://localhost for local Grafana)");
  }

  return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
}

async function grafanaGet(
  baseUrl: string,
  token: string,
  path: string
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, json };
}

export async function connectGrafanaAccount(params: {
  baseUrl: string;
  apiToken: string;
  name?: string;
  orgSlug: string;
}) {
  const apiToken = params.apiToken.trim();
  if (!apiToken) throw new Error("API token required");

  const baseUrl = normalizeBaseUrl(params.baseUrl);
  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  // /api/org can be public on some instances (e.g. play.grafana.org). Always require
  // an authenticated /api/user so invalid tokens cannot connect.
  const userProbe = await grafanaGet(baseUrl, apiToken, "/api/user");
  if (userProbe.status === 404) {
    throw new Error(
      "Grafana URL not found (404). Use your stack URL, e.g. https://your-stack.grafana.net (no trailing path)."
    );
  }
  if (!userProbe.ok) {
    if (userProbe.status === 401 || userProbe.status === 403) {
      const detail =
        typeof userProbe.json?.message === "string" ? userProbe.json.message : "Unauthorized";
      throw new Error(
        `Grafana rejected this token (${detail}). Open your Grafana stack → Administration → Users and access → Service accounts → create a service account → Add token (Viewer+). Paste the token secret only (often starts with glsa_), not the service account ID or a grafana.com access-policy token.`
      );
    }
    throw new Error(`Grafana API error (${userProbe.status}). Check the base URL and token.`);
  }

  const orgProbe = await grafanaGet(baseUrl, apiToken, "/api/org");
  let externalId: string;
  let orgName: string | undefined;

  if (orgProbe.ok && orgProbe.json) {
    const id = orgProbe.json.id;
    orgName = typeof orgProbe.json.name === "string" ? orgProbe.json.name : undefined;
    externalId = id !== undefined && id !== null ? String(id) : new URL(baseUrl).host;
  } else {
    const login = typeof userProbe.json?.login === "string" ? userProbe.json.login : null;
    externalId = login ? `${new URL(baseUrl).host}:${login}` : new URL(baseUrl).host;
  }

  await gateNewProviderConnection(org.id, org.plan, "GRAFANA");

  const metadata = { baseUrl, orgName };
  const displayName =
    params.name?.trim() || (orgName ? `Grafana (${orgName})` : `Grafana (${new URL(baseUrl).host})`);

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "GRAFANA",
        externalId,
      },
    },
    update: {
      isActive: true,
      name: displayName,
      accessToken: encrypt(apiToken),
      metadata,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "GRAFANA",
      category: "OBSERVABILITY",
      name: displayName,
      externalId,
      accessToken: encrypt(apiToken),
      scopes: [],
      metadata,
    },
  });

  return { integration, baseUrl, externalId };
}
