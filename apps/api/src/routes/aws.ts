import type { FastifyPluginAsync } from "fastify";
import { readFileSync } from "fs";
import { join } from "path";
import { ok, err } from "../lib/response.js";
import { connectAwsAccount } from "../services/cloud/aws/aws.connect.js";
import { isVikelaAwsConfigured } from "../lib/aws-session.js";
import { scheduleCloudAccountScan } from "../jobs/cloud-scan.schedule.js";
import { requireOrganization } from "../lib/org-context.js";
import { ensureOrganizationFromSession } from "../lib/clerk-org-provision.js";
import { ensureMembershipFromSession } from "../lib/membership.js";
import { requireAdmin } from "../lib/authorization.js";
import { assertCanConnectIntegration } from "../lib/plan-limits.js";
import { assertBillingAllowsUsage } from "../lib/plan-features.js";
import { logAuditEvent } from "../lib/audit-log.js";

function loadCloudFormationTemplate(): string {
  const candidates = [
    join(process.cwd(), "src/assets/vikela-scanner-role.yaml"),
    join(process.cwd(), "apps/api/src/assets/vikela-scanner-role.yaml"),
  ];
  for (const p of candidates) {
    try {
      return readFileSync(p, "utf8");
    } catch {
      continue;
    }
  }
  return "# CloudFormation template not found\n";
}

export const awsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/aws/cloudformation-template", async (_req, reply) => {
    const vikelaAccount = process.env.AWS_VIKELA_ACCOUNT_ID ?? "VIKELA_ACCOUNT_ID";
    const externalId = process.env.AWS_EXTERNAL_ID ?? "vikela-scanner";
    let template = loadCloudFormationTemplate();
    template = template
      .replace(/VIKELA_ACCOUNT_ID/g, vikelaAccount)
      .replace(/vikela-scanner/g, externalId);

    return reply
      .header("Content-Type", "text/yaml")
      .header("Content-Disposition", 'attachment; filename="vikela-scanner-role.yaml"')
      .send(template);
  });

  app.get("/aws/status", async (_req, reply) => {
    return reply.send(
      ok({
        vikelaAwsConfigured: isVikelaAwsConfigured(),
        vikelaAccountId: process.env.AWS_VIKELA_ACCOUNT_ID ?? null,
        externalId: process.env.AWS_EXTERNAL_ID ?? "vikela-scanner",
      })
    );
  });

  app.post("/integrations/aws/connect", async (req, reply) => {
    // Provision org/membership before requireAdmin (it resolves org for role checks).
    try {
      await ensureOrganizationFromSession(req);
      await ensureMembershipFromSession(req);
    } catch {
      /* header / sole-membership resolution may still succeed below */
    }

    let org;
    try {
      org = await requireOrganization(req);
    } catch {
      return reply
        .status(404)
        .send(
          err(
            "Organization not found — select Optic Inc (or your workspace) in the Clerk org switcher, refresh /integrations, then try again."
          )
        );
    }

    let member;
    try {
      member = await requireAdmin(req);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 403;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Forbidden"));
    }

    try {
      assertBillingAllowsUsage(org);
      await assertCanConnectIntegration(org.id, org.plan, { provider: "AWS" });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 402;
      return reply.status(status).send(err(e instanceof Error ? e.message : "Plan limit reached"));
    }

    const body = req.body as {
      roleArn: string;
      externalId?: string;
      accountName?: string;
      region?: string;
      scheduleDailyScan?: boolean;
    };

    if (!body.roleArn?.startsWith("arn:aws:iam::")) {
      return reply.status(400).send(err("Invalid roleArn — must be a valid IAM role ARN"));
    }

    try {
      const result = await connectAwsAccount({
        roleArn: body.roleArn,
        externalId: body.externalId,
        accountName: body.accountName,
        region: body.region,
        orgSlug: org.slug,
      });

      if (body.scheduleDailyScan !== false) {
        await scheduleCloudAccountScan(result.cloudAccount.id);
      }

      await logAuditEvent({
        orgId: org.id,
        actorId: member?.id,
        action: "cloud.aws.connected",
        target: result.cloudAccount.accountId,
      });

      return reply.send(
        ok({
          integrationId: result.integration.id,
          cloudAccountId: result.cloudAccount.id,
          accountId: result.cloudAccount.accountId,
          verified: result.verified,
        })
      );
    } catch (e) {
      return reply.status(400).send(err(e instanceof Error ? e.message : "AWS connect failed"));
    }
  });
};
