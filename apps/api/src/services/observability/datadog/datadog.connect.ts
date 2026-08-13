import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const ALLOWED_SITES = new Set([
  "datadoghq.com",
  "datadoghq.eu",
  "us3.datadoghq.com",
  "us5.datadoghq.com",
  "ap1.datadoghq.com",
  "ddog-gov.com",
]);

function normalizeSite(site?: string): string {
  const raw = (site?.trim() || "datadoghq.com").toLowerCase().replace(/^https?:\/\//, "");
  const host = raw.replace(/^api\./, "").replace(/\/.*$/, "");
  if (!ALLOWED_SITES.has(host)) {
    throw new Error(
      `Unsupported Datadog site "${host}". Use one of: ${[...ALLOWED_SITES].join(", ")}`
    );
  }
  return host;
}

export async function connectDatadogAccount(params: {
  apiKey: string;
  appKey: string;
  site?: string;
  name?: string;
  orgSlug: string;
}) {
  const apiKey = params.apiKey.trim();
  const appKey = params.appKey.trim();
  if (!apiKey) throw new Error("API key required");
  if (!appKey) throw new Error("Application key required");

  const site = normalizeSite(params.site);
  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  const validateUrl = `https://api.${site}/api/v1/validate`;
  const res = await fetch(validateUrl, {
    headers: {
      "DD-API-KEY": apiKey,
      "DD-APPLICATION-KEY": appKey,
      Accept: "application/json",
    },
  });

  if (res.status === 403 || res.status === 401) {
    throw new Error(
      "Datadog rejected these keys. Check API key + Application key and that the site matches your org (e.g. datadoghq.com vs datadoghq.eu)."
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Datadog validate failed (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`);
  }

  const json = (await res.json().catch(() => ({}))) as { valid?: boolean };
  if (json.valid === false) {
    throw new Error("Datadog reported the API key as invalid");
  }

  await gateNewProviderConnection(org, "DATADOG");

  const metadata = { site };
  const displayName = params.name?.trim() || `Datadog (${site})`;

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "DATADOG",
        externalId: site,
      },
    },
    update: {
      isActive: true,
      name: displayName,
      accessToken: encrypt(apiKey),
      refreshToken: encrypt(appKey),
      metadata,
      lastSyncedAt: new Date(),
    },
    create: {
      orgId: org.id,
      provider: "DATADOG",
      category: "OBSERVABILITY",
      name: displayName,
      externalId: site,
      accessToken: encrypt(apiKey),
      refreshToken: encrypt(appKey),
      scopes: [],
      metadata,
    },
  });

  return { integration, site };
}
