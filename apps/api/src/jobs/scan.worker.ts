import { registerScanWorker, type ScanJobPayload } from "./scan.job.js";
import { executeCodeScan } from "../services/scanner/execute-code-scan.js";
import { executeCloudScan } from "../services/scanner/execute-cloud-scan.js";
import { executeIdentityScan } from "../services/scanner/execute-identity-scan.js";
import { executeFullScan } from "../services/scanner/execute-full-scan.js";
import { finalizeLiteScan } from "../services/scanner/finalize-lite-scan.js";
import { prisma } from "../lib/prisma.js";

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

  await executeFullScan(payload.orgId);
}

export function startScanWorker() {
  if (process.env.DISABLE_SCAN_WORKER === "true") {
    console.log("Scan worker disabled (DISABLE_SCAN_WORKER=true)");
    return null;
  }

  try {
    const worker = registerScanWorker(handleScanJob);
    console.log("BullMQ scan worker started");
    return worker;
  } catch (e) {
    console.warn("Scan worker not started (Redis unavailable?):", e);
    return null;
  }
}
