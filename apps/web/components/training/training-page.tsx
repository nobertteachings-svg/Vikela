"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { apiPatch, apiPost } from "@/lib/api";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconPlus,
  IconSchool,
  IconSend,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import type { TrainingModuleProp } from "@/app/(app)/training/page";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { ProgressBar } from "@/components/comply/progress-bar";
import { StatCard } from "@/components/comply/stat-card";
import type { TrainingProgressRow } from "@/lib/compliance-api";

type TrainingStatus = "On track" | "At risk" | "Complete" | "Overdue" | "In progress" | "Not started";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

const STATUS_STYLES: Record<string, string> = {
  "On track": "border-comply-green/30 bg-comply-green/10 text-comply-green",
  "At risk": "border-comply-amber/30 bg-comply-amber/10 text-comply-amber-text",
  Complete: "border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border",
  Overdue: "border-comply-red/30 bg-comply-red/10 text-comply-red",
  "In progress": "border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border",
  "Not started": "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary",
};

export function TrainingPageContent({
  modules: initialModules,
  progress: initialProgress,
}: {
  modules: TrainingModuleProp[];
  progress: TrainingProgressRow[];
}) {
  const router = useRouter();
  const [trainingModules, setTrainingModules] = useState(initialModules);
  const [trainingMemberProgress, setTrainingMemberProgress] = useState(initialProgress);
  const [showAssign, setShowAssign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [moduleForm, setModuleForm] = useState({
    name: "",
    description: "",
    framework: "SOC 2 CC1.4",
    durationMin: 30,
    dueAt: "",
  });

  const totalAssigned = trainingModules.reduce((s, m) => s + m.total, 0) || 1;
  const totalCompleted = trainingModules.reduce((s, m) => s + m.completed, 0);
  const overallPct = Math.round((totalCompleted / totalAssigned) * 100);
  const atRisk = trainingModules.filter((m) => m.status === "At risk").length;
  const complete = trainingModules.filter((m) => m.status === "Complete").length;
  const overdueMembers = trainingMemberProgress.filter((m) => m.overdue > 0);

  async function createModule() {
    if (!moduleForm.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const mod = await apiPost<TrainingModuleProp>("/api/v1/training/modules", {
        ...moduleForm,
        assignToAll: true,
      });
      setTrainingModules((prev) => [...prev, mod]);
      setShowAssign(false);
      setModuleForm({
        name: "",
        description: "",
        framework: "SOC 2 CC1.4",
        durationMin: 30,
        dueAt: "",
      });
      setMessage({ type: "success", text: "Module created and assigned to all members" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to create module" });
    } finally {
      setSaving(false);
    }
  }

  async function assignModule(moduleId: string) {
    setSaving(true);
    setMessage(null);
    try {
      await apiPost(`/api/v1/training/modules/${moduleId}/assign`, {});
      setMessage({ type: "success", text: "Module assigned to all members" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Assign failed" });
    } finally {
      setSaving(false);
    }
  }

  async function markAssignmentComplete(assignmentId: string) {
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/training/assignments/${assignmentId}`, { status: "COMPLETE" });
      setMessage({ type: "success", text: "Marked complete" });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  }

  async function exportReport() {
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob("/api/v1/training/export", "training-report.csv");
      downloadBlob(blob, filename);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="People"
        title="Training"
        description="Security awareness, framework-specific modules, and completion tracking for audit evidence."
      >
        <ComplyButton variant="primary" className="gap-1.5 text-sm" onClick={() => setShowAssign(true)}>
          <IconPlus size={16} />
          Assign module
        </ComplyButton>
      </PageHeader>

      {message ? (
        <p
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 text-red-300"
          )}
        >
          {message.text}
        </p>
      ) : null}

      {showAssign ? (
        <Card elevated>
          <CardHeader title="New training module" />
          <CardBody className="space-y-3">
            <input
              className="comply-input w-full"
              placeholder="Module name"
              value={moduleForm.name}
              onChange={(e) => setModuleForm((f) => ({ ...f, name: e.target.value }))}
            />
            <textarea
              className="comply-input min-h-[72px] w-full"
              placeholder="Description"
              value={moduleForm.description}
              onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="comply-input w-full"
                placeholder="Framework (e.g. SOC 2 CC1.4)"
                value={moduleForm.framework}
                onChange={(e) => setModuleForm((f) => ({ ...f, framework: e.target.value }))}
              />
              <input
                type="date"
                className="comply-input w-full"
                value={moduleForm.dueAt}
                onChange={(e) => setModuleForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <ComplyButton variant="primary" disabled={saving} onClick={createModule}>
                {saving ? "Creating…" : "Create & assign to all"}
              </ComplyButton>
              <ComplyButton variant="secondary" onClick={() => setShowAssign(false)}>
                Cancel
              </ComplyButton>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="marketing-panel marketing-panel-highlight relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-comply-purple/20 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_200px] lg:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/50 bg-comply-purple/20">
              <IconSchool size={28} className="text-comply-purple-border" stroke={1.5} />
            </span>
            <div>
              <SectionLabel>Security training</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-comply-text-primary">
                {overallPct}% program completion across {trainingMemberProgress.length} people
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Training completion maps to SOC 2 CC1.4 and HIPAA workforce requirements. Export
                records for auditor evidence packages.
              </p>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <p className="font-mono text-4xl font-semibold tracking-tight text-comply-purple">
              {overallPct}%
            </p>
            <p className="text-xs text-comply-text-tertiary">overall completion</p>
          </div>
        </div>
        <div className="relative mt-6">
          <ProgressBar label="Organization progress" value={overallPct} suffix={`${overallPct}%`} variant="green" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Modules" value={String(trainingModules.length)} accent="purple" />
        <StatCard label="Complete" value={String(complete)} accent="green" />
        <StatCard label="At risk" value={String(atRisk)} accent="amber" />
        <StatCard label="Overdue (people)" value={String(overdueMembers.length)} accent="red" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trainingModules.map((m) => {
          const pct = Math.round((m.completed / m.total) * 100);
          return (
            <Card key={m.id} elevated={m.status === "At risk"}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-comply-purple-border/30 bg-comply-purple/15 text-comply-purple-border">
                    <IconSchool size={20} stroke={1.5} />
                  </span>
                  <span
                    className={cn(
                      "comply-badge normal-case text-[10px]",
                      STATUS_STYLES[m.status as TrainingStatus] ?? STATUS_STYLES["On track"]
                    )}
                  >
                    {m.status}
                  </span>
                </div>
                <h2 className="mt-3 font-semibold text-comply-text-primary">{m.name}</h2>
                <p className="mt-1 text-xs leading-relaxed text-comply-text-secondary">{m.description}</p>
                <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-comply-purple">
                  {m.completed}
                  <span className="text-base font-normal text-comply-text-tertiary">/{m.total}</span>
                  <span className="ml-2 text-sm font-sans font-normal text-comply-text-secondary">
                    completed
                  </span>
                </p>
                <div className="mt-4">
                  <ProgressBar label="Completion" value={pct} suffix={`${pct}%`} variant="green" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-comply-text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <IconClock size={14} />
                    {m.duration}
                  </span>
                  <span>Due {m.due}</span>
                  <span className="font-mono text-[10px] text-comply-purple-border">{m.framework ?? "General"}</span>
                </div>
                <ComplyButton
                  variant="secondary"
                  className="mt-4 w-full text-xs"
                  disabled={saving}
                  onClick={() => assignModule(m.id)}
                >
                  Assign to all members
                </ComplyButton>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card elevated>
        <CardHeader
          title="Completion by member"
          action={
            <ComplyButton variant="ghost" className="gap-1 text-xs">
              <IconSend size={14} />
              Send reminders
            </ComplyButton>
          }
        />
        <CardBody className="p-0 pb-1">
          <DataTable>
            <thead>
              <tr>
                <th>Member</th>
                <th>Progress</th>
                <th>Completed</th>
                <th>Overdue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {trainingMemberProgress.map((m: TrainingProgressRow) => {
                const pct = Math.round((m.completed / m.total) * 100);
                return (
                  <tr key={m.id}>
                    <td className="font-medium">{m.name}</td>
                    <td className="min-w-[160px]">
                      <div className="comply-progress-track">
                        <div
                          className="comply-progress-bar from-comply-green-dark to-comply-green"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="font-mono text-sm text-comply-text-secondary">
                      {m.completed}/{m.total}
                    </td>
                    <td>
                      {m.overdue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-comply-red">
                          <IconAlertTriangle size={14} />
                          {m.overdue}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-comply-green">
                          <IconCircleCheck size={14} />
                          None
                        </span>
                      )}
                    </td>
                    <td>
                      {m.assignments
                        ?.filter((a) => a.status !== "Complete")
                        .slice(0, 1)
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            disabled={saving}
                            className="text-xs font-medium text-comply-purple-border hover:underline disabled:opacity-50"
                            onClick={() => markAssignmentComplete(a.id)}
                          >
                            Mark complete
                          </button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>

      <div className="marketing-panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <SectionLabel>Audit evidence</SectionLabel>
          <p className="mt-2 text-sm text-comply-text-secondary">
            Export training completion certificates and sign-off logs for SOC 2 CC1.4 evidence.
          </p>
        </div>
        <ComplyButton
          variant="secondary"
          className="text-sm"
          disabled={exporting}
          onClick={exportReport}
        >
          {exporting ? "Exporting…" : "Export training report"}
        </ComplyButton>
      </div>
    </div>
  );
}
