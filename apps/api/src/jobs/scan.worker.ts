import IORedis from "ioredis";
import { registerScanWorker, type ScanJobPayload } from "./scan.job.js";
import { executeCodeScan } from "../services/scanner/execute-code-scan.js";
import { executeCloudScan } from "../services/scanner/execute-cloud-scan.js";
import { executeIdentityScan } from "../services/scanner/execute-identity-scan.js";
import { executeFullScan } from "../services/scanner/execute-full-scan.js";
import { finalizeLiteScan } from "../services/scanner/finalize-lite-scan.js";
import { prisma } from "../lib/prisma.js";

const WORKER_LOCK_KEY = "shieldoq:scan-worker-lock";
const WORKER_LOCK_TTL_SEC = 45;

async function handleScanJob(payload: ScanJobPayload) {
  if (payload.type === "code") {
    const result = await executeCodeScan({
      repoId: payload.repoId,
      branch: payload.branch,
      prNumber: payload.prNumber,
      commitSha: payload.commitSha,
      postPrComments: payload.postPrComments ?? Boolean(payload.prNumber),
      scanId: payload.liteScanId,
    });

    if (payload.liteScan && payload.liteScanId) {
      const repo = await prisma.repository.findUnique({ where: { id: payload.repoId } });
      await finalizeLiteScan({
        scanId: payload.liteScanId,
        orgId: repo?.orgId ?? "",
        repoId: payload.repoId,
        repoStack: payload.repoStack ?? "generic",
        realGapCount: result.gapCount,
        realFindings: result.findings,
        listFailed: result.listFailed || Boolean(payload.stackListFailed),
        filesListed: result.filesListed,
        provider: payload.gitProvider,
      });
    }
    return;
  }

  if (payload.type === "cloud") {
    await executeCloudScan({ cloudAccountId: payload.cloudAccountId });
    return;
  }

  if (payload.type === "identity") {
    await executeIdentityScan({ integrationId: payload.integrationId });
    return;
  }

  await executeFullScan(payload.orgId, payload.scanId);
}

/**
 * Only one API process should consume the scan queue. Multiple `tsx watch`
 * instances otherwise steal/stall the same BullMQ jobs and leave scans RUNNING forever.
 */
export function startScanWorker() {
  if (process.env.DISABLE_SCAN_WORKER === "true") {
    console.log("Scan worker disabled (DISABLE_SCAN_WORKER=true)");
    return null;
  }

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const lockRedis = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const lockToken = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  void (async () => {
    try {
      const acquired = await lockRedis.set(
        WORKER_LOCK_KEY,
        lockToken,
        "EX",
        WORKER_LOCK_TTL_SEC,
        "NX"
      );
      if (acquired !== "OK") {
        console.log("Scan worker skipped, another API process already owns the queue");
        await lockRedis.quit().catch(() => {});
        return;
      }

      const renew = setInterval(() => {
        void (async () => {
          try {
            const current = await lockRedis.get(WORKER_LOCK_KEY);
            if (current === lockToken) {
              await lockRedis.expire(WORKER_LOCK_KEY, WORKER_LOCK_TTL_SEC);
            }
          } catch {
            /* ignore renew errors */
          }
        })();
      }, 15_000);

      const worker = registerScanWorker(handleScanJob);
      console.log("BullMQ scan worker started (exclusive lock acquired)");

      const release = async () => {
        clearInterval(renew);
        try {
          const current = await lockRedis.get(WORKER_LOCK_KEY);
          if (current === lockToken) await lockRedis.del(WORKER_LOCK_KEY);
        } catch {
          /* ignore */
        }
        await lockRedis.quit().catch(() => {});
      };

      worker.on("closed", () => {
        void release();
      });
      process.once("SIGTERM", () => {
        void release();
      });
      process.once("SIGINT", () => {
        void release();
      });
    } catch (e) {
      console.warn("Scan worker not started (Redis unavailable?):", e);
      await lockRedis.quit().catch(() => {});
    }
  })();

  return null;
}
