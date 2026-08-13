"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconLoader2,
  IconAlertTriangle,
  IconScan,
  IconX,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { API_URL, orgHeaders } from "@/lib/api";
import { useOrgRole } from "@/hooks/use-org-role";

type ScanPhase = "idle" | "queuing" | "running" | "completed" | "failed";

type ScanSnapshot = {
  id: string;
  status: string;
  score: number | null;
  gapsFound: number;
  totalChecks?: number;
};

const POLL_MS = 2000;
/** Soft warning only — keep polling while scan is still PENDING/RUNNING. */
const SOFT_WARN_MS = 8 * 60 * 1000;
/** Hard stop only if the scan disappears or stays non-terminal this long. */
const HARD_STOP_MS = 45 * 60 * 1000;

export function FullScanButton() {
  const { isAuditor: auditor, isLoaded } = useOrgRole();
  const router = useRouter();
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [scanId, setScanId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ScanSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAt = useRef<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    pollTimer.current = null;
    tickTimer.current = null;
  }

  useEffect(() => () => clearTimers(), []);

  async function fetchScan(id: string): Promise<ScanSnapshot | null> {
    const headers = await orgHeaders();
    const res = await fetch(`${API_URL}/api/v1/scans`, { headers, credentials: "include" });
    const json = await res.json();
    if (json.error || !Array.isArray(json.data)) return null;
    const row = json.data.find((s: ScanSnapshot) => s.id === id);
    return row ?? null;
  }

  function startPolling(id: string) {
    startedAt.current = Date.now();
    setElapsedSec(0);
    setSlowHint(false);
    tickTimer.current = setInterval(() => {
      if (!startedAt.current) return;
      const elapsed = Date.now() - startedAt.current;
      setElapsedSec(Math.floor(elapsed / 1000));
      if (elapsed > SOFT_WARN_MS) setSlowHint(true);
    }, 1000);

    const poll = async () => {
      const elapsed = startedAt.current ? Date.now() - startedAt.current : 0;
      try {
        const row = await fetchScan(id);
        if (!row) {
          if (elapsed > HARD_STOP_MS) {
            clearTimers();
            setPhase("failed");
            setError("Could not find this scan anymore. Check Scan history.");
          }
          return;
        }
        setSnapshot(row);
        if (row.status === "COMPLETED") {
          clearTimers();
          setPhase("completed");
          router.refresh();
          return;
        }
        if (row.status === "FAILED") {
          clearTimers();
          setPhase("failed");
          setError("Scan failed. Open Scan history for details, then try again.");
          router.refresh();
          return;
        }
        setPhase("running");
        // Still PENDING/RUNNING — never treat as failed just because it's slow.
        if (elapsed > HARD_STOP_MS) {
          clearTimers();
          setPhase("failed");
          setError(
            "Scan is still marked in progress after 45 minutes. Check Scan history or restart the API worker, then try again."
          );
        }
      } catch {
        // keep polling through transient network blips
      }
    };

    void poll();
    pollTimer.current = setInterval(() => void poll(), POLL_MS);
  }

  async function runFullScan() {
    setError(null);
    setSnapshot(null);
    setSlowHint(false);
    setPhase("queuing");
    clearTimers();
    try {
      const headers = await orgHeaders();
      const res = await fetch(`${API_URL}/api/v1/scans/full`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ async: true }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const id = json.data?.scanId as string | undefined;
      if (!id) throw new Error("Scan queued but no scan id returned");
      setScanId(id);
      setPhase("running");
      startPolling(id);
    } catch (e) {
      clearTimers();
      setPhase("failed");
      setError(e instanceof Error ? e.message : "Scan failed");
    }
  }

  function dismiss() {
    clearTimers();
    setPhase("idle");
    setScanId(null);
    setSnapshot(null);
    setError(null);
    setSlowHint(false);
    setElapsedSec(0);
  }

  if (isLoaded && auditor) return null;

  const busy = phase === "queuing" || phase === "running";
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const elapsedLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-end gap-2">
      <ComplyButton
        variant="secondary"
        onClick={runFullScan}
        disabled={busy}
        className="text-sm"
        aria-busy={busy}
      >
        {busy ? (
          <IconLoader2 size={18} className="animate-spin" />
        ) : (
          <IconScan size={18} />
        )}
        {phase === "queuing"
          ? "Starting…"
          : phase === "running"
            ? "Scanning…"
            : "Run full scan"}
      </ComplyButton>

      {phase !== "idle" ? (
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-md rounded-lg border border-comply-border bg-comply-surface px-4 py-3 shadow-lg sm:min-w-[22rem]"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {busy ? (
                <IconLoader2 size={20} className="animate-spin text-comply-purple-border" />
              ) : phase === "completed" ? (
                <IconCheck size={20} className="text-comply-green" />
              ) : (
                <IconAlertTriangle size={20} className="text-comply-amber" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {phase === "queuing" ? (
                <>
                  <p className="text-sm font-semibold text-comply-text-primary">
                    Starting full compliance scan
                  </p>
                  <p className="mt-1 text-xs text-comply-text-secondary">
                    Queuing code, cloud, and identity checks…
                  </p>
                </>
              ) : null}

              {phase === "running" ? (
                <>
                  <p className="text-sm font-semibold text-comply-text-primary">
                    Scan in progress
                  </p>
                  <p className="mt-1 text-xs text-comply-text-secondary">
                    Scanning connected repos, cloud accounts, and identity providers.
                    This panel updates automatically — leave it open.
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-comply-border/60">
                    <div className="comply-scan-progress h-full rounded-full bg-comply-purple-border" />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-comply-text-tertiary">
                    Elapsed {elapsedLabel}
                    {snapshot?.status ? ` · ${snapshot.status}` : ""}
                  </p>
                  {slowHint ? (
                    <p className="mt-2 text-[11px] text-comply-amber">
                      Large repos can take several minutes. Still working — not stuck yet.
                    </p>
                  ) : null}
                </>
              ) : null}

              {phase === "completed" ? (
                <>
                  <p className="text-sm font-semibold text-comply-green">Scan complete</p>
                  <p className="mt-1 text-xs text-comply-text-secondary">
                    Posture score{" "}
                    <span className="font-mono font-semibold text-comply-text-primary">
                      {snapshot?.score ?? "—"}
                    </span>
                    {" · "}
                    <span className="font-mono font-semibold text-comply-text-primary">
                      {snapshot?.gapsFound ?? 0}
                    </span>{" "}
                    gaps in this run
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <Link href="/gaps" className="comply-link" onClick={dismiss}>
                      View gaps
                    </Link>
                    <Link href="/scans" className="comply-link" onClick={dismiss}>
                      Scan history
                    </Link>
                    {scanId ? (
                      <Link
                        href={`/gaps?scanId=${encodeURIComponent(scanId)}`}
                        className="comply-link"
                        onClick={dismiss}
                      >
                        Gaps from this scan
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : null}

              {phase === "failed" ? (
                <>
                  <p className="text-sm font-semibold text-comply-amber">Scan issue</p>
                  <p className="mt-1 text-xs text-comply-text-secondary">
                    {error ?? "Something went wrong."}
                  </p>
                  <button
                    type="button"
                    className="comply-link mt-3 text-xs"
                    onClick={runFullScan}
                  >
                    Try again
                  </button>
                </>
              ) : null}
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded p-0.5 text-comply-text-tertiary hover:text-comply-text-primary"
              aria-label="Dismiss scan status"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
