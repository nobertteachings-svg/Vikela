import { prisma } from "../../../lib/prisma.js";
import { encrypt } from "../../../lib/crypto.js";
import { gateNewProviderConnection } from "../../../lib/integration-plan-gate.js";

const PD_API = "https://api.pagerduty.com";

type PdUser = {
  id: string;
  name?: string;
  email?: string;
};

async function validatePagerDutyToken(apiToken: string): Promise<PdUser> {
  // Classic REST API keys use "Token token="; OAuth access tokens use Bearer.
  const attempts: { Authorization: string }[] = [
    { Authorization: `Token token=${apiToken}` },
    { Authorization: `Bearer ${apiToken}` },
  ];

  let lastStatus = 0;
  let lastBody = "";

  for (const auth of attempts) {
    const res = await fetch(`${PD_API}/users/me`, {
      headers: {
        ...auth,
        Accept: "application/vnd.pagerduty+json;version=2",
      },
    });
    lastStatus = res.status;
    lastBody = await res.text().catch(() => "");

    if (res.ok) {
      const json = JSON.parse(lastBody || "{}") as { user?: PdUser };
      if (!json.user?.id) {
        throw new Error("PagerDuty validate succeeded but returned no user id");
      }
      return json.user;
    }
    if (res.status !== 401 && res.status !== 403) {
      break;
    }
  }

  if (lastStatus === 401 || lastStatus === 403) {
    throw new Error(
      "PagerDuty rejected this token. In PagerDuty → User icon → My Profile → User Settings → Create API Access Key (or use a valid OAuth access token)."
    );
  }
  throw new Error(
    `PagerDuty API error (${lastStatus})${lastBody ? `: ${lastBody.slice(0, 160)}` : ""}`
  );
}

export async function connectPagerDutyAccount(params: {
  apiToken: string;
  name?: string;
  orgSlug: string;
}) {
  const apiToken = params.apiToken.trim();
  if (!apiToken) throw new Error("API token required");

  const org = await prisma.organization.findFirst({ where: { slug: params.orgSlug } });
  if (!org) throw new Error(`Organization not found: ${params.orgSlug}`);

  const user = await validatePagerDutyToken(apiToken);
  await gateNewProviderConnection(org, "PAGERDUTY");

  const metadata = {
    userId: user.id,
    email: user.email,
    userName: user.name,
  };
  const displayName =
    params.name?.trim() ||
    (user.email ? `PagerDuty (${user.email})` : user.name ? `PagerDuty (${user.name})` : "PagerDuty");

  const integration = await prisma.integration.upsert({
    where: {
      orgId_provider_externalId: {
        orgId: org.id,
        provider: "PAGERDUTY",
        externalId: user.id,
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
      provider: "PAGERDUTY",
      category: "OBSERVABILITY",
      name: displayName,
      externalId: user.id,
      accessToken: encrypt(apiToken),
      scopes: [],
      metadata,
    },
  });

  return { integration, userId: user.id };
}
