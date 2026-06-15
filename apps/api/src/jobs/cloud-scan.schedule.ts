import { scanQueue } from "./scan.job.js";

const DAILY_CRON = process.env.CLOUD_SCAN_CRON ?? "0 2 * * *";

export async function scheduleCloudAccountScan(cloudAccountId: string) {
  await scanQueue.add(
    "cloud-scan",
    { type: "cloud", cloudAccountId },
    {
      jobId: `cloud-scheduled-${cloudAccountId}`,
      repeat: { pattern: DAILY_CRON },
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
}

export async function scheduleAllCloudAccounts() {
  const { prisma } = await import("../lib/prisma.js");
  const accounts = await prisma.cloudAccount.findMany({ where: { isActive: true } });
  for (const account of accounts) {
    await scheduleCloudAccountScan(account.id);
  }
}
