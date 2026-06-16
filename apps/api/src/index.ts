import "./load-env.js";
import { initSentry, captureException } from "./lib/sentry.js";
initSentry();
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { clerkPlugin } from "@clerk/fastify";
import { requireEncryptionKey } from "./lib/crypto.js";
import { requireProductionClerkConfig } from "./lib/auth.js";
import { validateApiProductionEnv, assertApiConnectivity } from "./lib/validate-production-env.js";
import { authGuardPlugin } from "./plugins/auth-guard.js";
import { frameworksRoutes } from "./routes/frameworks.js";
import { controlsRoutes } from "./routes/controls.js";
import { gapsRoutes } from "./routes/gaps.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { integrationsRoutes } from "./routes/integrations.js";
import { scansRoutes } from "./routes/scans.js";
import { authRoutes } from "./routes/auth.js";
import { webhooksRoutes } from "./routes/webhooks.js";
import { repositoriesRoutes } from "./routes/repositories.js";
import { awsRoutes } from "./routes/aws.js";
import { cloudAccountsRoutes } from "./routes/cloud-accounts.js";
import { identityRoutes } from "./routes/identity.js";
import { evidenceRoutes } from "./routes/evidence.js";
import { policiesRoutes } from "./routes/policies.js";
import { copilotRoutes } from "./routes/copilot.js";
import { orgRoutes } from "./routes/org.js";
import { clerkWebhookRoutes } from "./routes/clerk-webhook.js";
import { azureCloudRoutes } from "./routes/azure-cloud.js";
import { gcpCloudRoutes } from "./routes/gcp-cloud.js";
import { vendorsRoutes } from "./routes/vendors.js";
import { risksRoutes } from "./routes/risks.js";
import { membersRoutes } from "./routes/members.js";
import { billingRoutes } from "./routes/billing.js";
import { trainingRoutes } from "./routes/training.js";
import { questionnairesRoutes } from "./routes/questionnaires.js";
import { stripeWebhookRoutes } from "./routes/stripe-webhook.js";
import { settingsRoutes } from "./routes/settings.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { startScanWorker } from "./jobs/scan.worker.js";
import { scheduleAllCloudAccounts } from "./jobs/cloud-scan.schedule.js";
import { scheduleAllIdentityIntegrations } from "./jobs/identity-scan.schedule.js";

const PORT = Number(process.env.PORT ?? 3001);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function parseCorsOrigins(): string[] {
  const origins = new Set<string>([
    process.env.APP_URL ?? "http://localhost:3000",
    "http://localhost:3000",
  ]);
  const extra = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
  if (extra) extra.forEach((o) => origins.add(o));
  return [...origins];
}

async function main() {
  requireEncryptionKey();
  requireProductionClerkConfig();
  validateApiProductionEnv();
  await assertApiConnectivity();

  const app = Fastify({ logger: true, trustProxy: true });

  app.setNotFoundHandler(async (req, reply) => {
    const accept = String(req.headers.accept ?? "");
    const isBrowserRequest = req.method === "GET" && accept.includes("text/html");
    const isApiPath =
      req.url.startsWith("/api/") ||
      req.url.startsWith("/api?") ||
      req.url === "/api" ||
      req.url.startsWith("/health");

    if (isBrowserRequest && !isApiPath) {
      const target = new URL(req.url, APP_URL);
      return reply.redirect(target.toString(), 302);
    }

    return reply.code(404).send({ data: null, error: "Not Found" });
  });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      (req as { rawBody?: string }).rawBody = body as string;
      try {
        done(null, JSON.parse(body as string));
      } catch (e) {
        done(e as Error, undefined);
      }
    }
  );

  await app.register(cors, {
    origin: parseCorsOrigins(),
    credentials: true,
  });

  if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required in production");
  }

  if (process.env.CLERK_SECRET_KEY) {
    await app.register(clerkPlugin);
  }

  await app.register(rateLimit, {
    max: Number(process.env.API_RATE_LIMIT_MAX ?? 300),
    timeWindow: "1 minute",
  });

  await app.register(authGuardPlugin);

  app.get("/health", async () => ({ status: "ok", service: "vikela-api" }));

  await app.register(dashboardRoutes, { prefix: "/api/v1" });
  await app.register(frameworksRoutes, { prefix: "/api/v1" });
  await app.register(controlsRoutes, { prefix: "/api/v1" });
  await app.register(gapsRoutes, { prefix: "/api/v1" });
  await app.register(integrationsRoutes, { prefix: "/api/v1" });
  await app.register(scansRoutes, { prefix: "/api/v1" });
  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(webhooksRoutes, { prefix: "/api/v1" });
  await app.register(repositoriesRoutes, { prefix: "/api/v1" });
  await app.register(awsRoutes, { prefix: "/api/v1" });
  await app.register(cloudAccountsRoutes, { prefix: "/api/v1" });
  await app.register(identityRoutes, { prefix: "/api/v1" });
  await app.register(evidenceRoutes, { prefix: "/api/v1" });
  await app.register(policiesRoutes, { prefix: "/api/v1" });
  await app.register(copilotRoutes, { prefix: "/api/v1" });
  await app.register(orgRoutes, { prefix: "/api/v1" });
  await app.register(clerkWebhookRoutes, { prefix: "/api/v1" });
  await app.register(azureCloudRoutes, { prefix: "/api/v1" });
  await app.register(gcpCloudRoutes, { prefix: "/api/v1" });
  await app.register(vendorsRoutes, { prefix: "/api/v1" });
  await app.register(risksRoutes, { prefix: "/api/v1" });
  await app.register(membersRoutes, { prefix: "/api/v1" });
  await app.register(billingRoutes, { prefix: "/api/v1" });
  await app.register(trainingRoutes, { prefix: "/api/v1" });
  await app.register(questionnairesRoutes, { prefix: "/api/v1" });
  await app.register(stripeWebhookRoutes, { prefix: "/api/v1" });
  await app.register(settingsRoutes, { prefix: "/api/v1" });
  await app.register(onboardingRoutes, { prefix: "/api/v1" });

  startScanWorker();
  scheduleAllCloudAccounts().catch(() => {});
  scheduleAllIdentityIntegrations().catch(() => {});

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Vikela API running on http://localhost:${PORT}`);
}

main().catch((e) => {
  captureException(e);
  console.error(e);
  process.exit(1);
});
