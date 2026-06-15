import { prisma } from "../lib/prisma.js";
import { scanQueue } from "./scan.job.js";

const CRON = process.env.IDENTITY_SCAN_CRON ?? "0 3 * * *";

export async function scheduleAllIdentityIntegrations() {
  const integrations = await prisma.integration.findMany({
    where: { category: "IDENTITY", isActive: true },
    select: { id: true, provider: true },
  });

  for (const i of integrations) {
    await scanQueue.add(
      `identity-scheduled-${i.id}`,
      { type: "identity", integrationId: i.id },
      {
        repeat: { pattern: CRON },
        jobId: `identity-scan-${i.id}`,
      }
    );
  }

  if (integrations.length > 0) {
    console.log(`Scheduled ${integrations.length} identity scan(s) (${CRON})`);
  }
}
