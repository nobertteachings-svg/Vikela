"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrowserChrome } from "@/components/comply/browser-chrome";
import { StepIndicator } from "@/components/comply/step-indicator";
import { apiGet, apiPost } from "@/lib/api";

type LiteScanStatus = {
  scanId: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  source?: "repo" | "sample" | "mixed";
  findingCount?: number;
  score?: number;
  repoFullName?: string;
  repoStack?: string;
  hasSampleGaps?: boolean;
  error?: string;
};

export function OnboardingScan() {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const repoId = searchParams.get("repoId");
  const [scan, setScan] = useState<LiteScanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (scanId: string) => {
    return apiGet<LiteScanStatus>(`/api/v1/onboarding/lite-scan/status?scanId=${scanId}`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      try {
        const started = await apiPost<LiteScanStatus>(
          "/api/v1/onboarding/lite-scan",
          repoId ? { repoId } : undefined
        );
        if (cancelled) return;
        setScan(started);

        if (started.status === "COMPLETED") return;

        let attempts = 0;
        const poll = async () => {
          if (cancelled || !started.scanId) return;
          attempts += 1;
          const status = await pollStatus(started.scanId);
          if (cancelled) return;
          setScan(status);

          if (status.status === "COMPLETED" || status.status === "FAILED") return;
          if (attempts < 120) {
            timer = setTimeout(poll, 1500);
          } else {
            setError("Scan is taking longer than expected. You can continue to the dashboard.");
          }
        };

        timer = setTimeout(poll, 1500);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not start scan");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollStatus, repoId]);

  const done = scan?.status === "COMPLETED";
  const failed = scan?.status === "FAILED";
  const showSampleNote = scan?.hasSampleGaps || scan?.source === "sample" || scan?.source === "mixed";

  return (
    <BrowserChrome url="app.vikela.com/onboarding/scan" contentClassName="px-8 py-6">
      <StepIndicator currentStep={2} />

      <h1 className="text-center text-sm font-medium text-comply-text-primary">
        {done ? "Your first scan is ready" : "Scanning your repository"}
      </h1>
      <p className="mt-1 text-center text-xs text-comply-text-secondary">
        {connected
          ? `Connected ${connected}. `
          : null}
        {done
          ? scan.repoFullName
            ? `Findings from ${scan.repoFullName}`
            : "Compliance gaps are ready to review"
          : "Checking code for secrets, dependencies, and security misconfigurations…"}
      </p>

      {error && (
        <p className="mx-auto mt-4 max-w-md text-center text-xs text-red-400">{error}</p>
      )}

      {!done && !failed && (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-comply-purple-border border-t-transparent" />
          <p className="text-xs text-comply-text-tertiary">
            {scan?.repoFullName ? `Scanning ${scan.repoFullName}…` : "Starting scan…"}
          </p>
        </div>
      )}

      {failed && (
        <p className="mx-auto mt-6 max-w-md text-center text-xs text-comply-text-secondary">
          {scan?.error ?? "Scan failed."}{" "}
          <Link href="/dashboard" className="text-comply-purple-border hover:underline">
            Continue to dashboard
          </Link>
        </p>
      )}

      {done && (
        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4">
          <div className="w-full rounded-md border border-[var(--border)] bg-comply-card px-4 py-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Posture score
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold text-comply-purple">{scan.score ?? "—"}</p>
            <p className="mt-2 text-xs text-comply-text-secondary">
              {scan.findingCount ?? 0} open finding{(scan.findingCount ?? 0) === 1 ? "" : "s"}
            </p>
          </div>

          {showSampleNote && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200/90">
              <strong>Sample preview</strong>: we couldn&apos;t find enough issues in the connected repo
              {scan.repoStack ? ` (${scan.repoStack})` : ""}, so these example findings show what Vikela
              surfaces. Connect more repos or run a full scan for live results.
            </p>
          )}

          <Link href="/dashboard" className="btn-purple-cta w-full max-w-[280px] text-center">
            View dashboard
          </Link>
          <Link href="/onboarding/connect-cloud" className="text-xs text-comply-muted hover:underline">
            Continue onboarding (cloud)
          </Link>
        </div>
      )}
    </BrowserChrome>
  );
}

export default OnboardingScan;
