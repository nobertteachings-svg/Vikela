"use client";

import Link from "next/link";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { ScanLiteBadge } from "@/components/scans/scan-lite-badge";
import type { ScanRow } from "@/lib/compliance-api";

function formatTrigger(scan: ScanRow): string {
  if (scan.scanType === "CODE") {
    return scan.prNumber ? `PR #${scan.prNumber}` : `push${scan.branch ? ` (${scan.branch})` : ""}`;
  }
  if (scan.scanType === "FULL") return "manual";
  return scan.scanType.toLowerCase();
}

function formatStatus(status: string): string {
  if (status === "COMPLETED") return "Completed";
  if (status === "FAILED") return "Failed";
  if (status === "RUNNING") return "In progress";
  if (status === "PENDING") return "Queued";
  return status;
}

export function ScansClient({
  scans,
  trend,
}: {
  scans: ScanRow[];
  trend: { week: string; score: number }[];
}) {
  const completed = scans.filter((s) => s.status === "COMPLETED").length;
  const totalGaps = scans.reduce((n, s) => n + (s.gapsFound ?? 0), 0);

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Monitoring"
        title="Scan history"
        description="Posture trend and every scan run across code, cloud, and identity sources."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Recent scans
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-comply-green">{scans.length}</p>
            <p className="mt-1 text-[10px] text-comply-muted">Last 20 shown</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Completed
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-comply-green">{completed}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
              Gaps found
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-comply-text-primary">{totalGaps}</p>
            <p className="mt-1 text-[10px] text-comply-muted">In recent scans</p>
          </CardBody>
        </Card>
      </div>

      <Card elevated>
        <CardHeader title="Posture score trend" />
        <CardBody className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" tick={{ fill: "#a8a29e", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#a8a29e", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "rgba(28,28,26,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#16a34a"
                fill="url(#scoreFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card elevated>
        <CardHeader title="Scan runs" />
        <CardBody className="p-0 pb-1">
          <DataTable>
            <thead>
              <tr>
                <th>Date</th>
                <th>Trigger</th>
                <th>Target</th>
                <th>Gaps found</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-comply-text-secondary">
                    No scans yet. Connect an integration and run your first scan.
                  </td>
                </tr>
              ) : (
                scans.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">
                      {new Date(s.startedAt).toLocaleDateString()}
                    </td>
                    <td className="font-mono text-xs text-comply-text-secondary">
                      {formatTrigger(s)}
                      {s.isLiteScan ? <ScanLiteBadge /> : null}
                    </td>
                    <td className="text-comply-text-secondary">{s.target ?? "—"}</td>
                    <td className="font-mono">
                      {s.gapsFound > 0 ? (
                        <Link
                          href={`/gaps?scanId=${encodeURIComponent(s.id)}`}
                          className="comply-link font-mono"
                        >
                          {s.gapsFound}
                        </Link>
                      ) : (
                        <span className="text-comply-text-secondary">0</span>
                      )}
                    </td>
                    <td className="font-mono font-semibold text-comply-green-border">
                      {s.score ?? "—"}
                    </td>
                    <td>
                      <span
                        className={
                          s.status === "COMPLETED"
                            ? "text-comply-green"
                            : s.status === "FAILED"
                              ? "text-comply-red"
                              : "text-comply-amber"
                        }
                      >
                        {formatStatus(s.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </div>
  );
}
