import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const scanQueue = new Queue("shieldoq-scans", { connection });

export type ScanJobPayload =
  | {
      type: "code";
      repoId: string;
      branch?: string;
      prNumber?: number;
      commitSha?: string;
      postPrComments?: boolean;
      liteScan?: boolean;
      liteScanId?: string;
      repoStack?: import("../services/scanner/detect-repo-stack.js").RepoStack;
      stackListFailed?: boolean;
      gitProvider?: import("../lib/product-events.js").LiteScanGitProvider;
    }
  | { type: "cloud"; cloudAccountId: string }
  | { type: "identity"; integrationId: string }
  | { type: "full"; orgId: string; scanId?: string };

export function registerScanWorker(handler: (job: ScanJobPayload) => Promise<void>) {
  const worker = new Worker<ScanJobPayload>(
    "shieldoq-scans",
    async (job) => handler(job.data),
    { connection, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`Scan job ${job?.id} failed:`, err.message);
  });

  return worker;
}
