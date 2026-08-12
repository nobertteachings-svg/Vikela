"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetBlob, downloadBlob } from "@/lib/api-blob";
import { apiDelete, apiPatch, apiPost } from "@/lib/api";
import {
  IconAlertTriangle,
  IconCertificate,
  IconCircleCheck,
  IconClock,
  IconPencil,
  IconPlus,
  IconSchool,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { ComplyButton } from "@/components/comply/button";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import type { TrainingModuleProp } from "@/app/(app)/training/page";
import { DataTable } from "@/components/comply/data-table";
import { PageHeader } from "@/components/comply/page-header";
import { ProgressBar } from "@/components/comply/progress-bar";
import { StatCard } from "@/components/comply/stat-card";
import type { TrainingMineResponse, TrainingProgressRow } from "@/lib/compliance-api";
import { cn } from "@/lib/utils";
import { CoursePlayer } from "./course-player";

type TrainingStatus =
  | "On track"
  | "At risk"
  | "Complete"
  | "Overdue"
  | "In progress"
  | "Not started"
  | "Unassigned";

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
  Unassigned: "border-white/[0.12] bg-white/[0.04] text-comply-text-secondary",
};

const emptyModuleForm = {
  name: "",
  description: "",
  framework: "SOC 2 CC1.4",
  durationMin: 30,
  dueAt: "",
  assignToAll: true,
  memberIds: [] as string[],
};

export function TrainingPageContent({
  modules: initialModules,
  progress: initialProgress,
  currentMemberId: initialCurrentMemberId,
  mine: initialMine,
}: {
  modules: TrainingModuleProp[];
  progress: TrainingProgressRow[];
  currentMemberId: string | null;
  mine: TrainingMineResponse;
}) {
  const router = useRouter();
  const [trainingModules, setTrainingModules] = useState(initialModules);
  const [trainingMemberProgress, setTrainingMemberProgress] = useState(initialProgress);
  const [currentMemberId, setCurrentMemberId] = useState(initialCurrentMemberId);
  const [mine, setMine] = useState(initialMine);
  const [showAssign, setShowAssign] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignPickerId, setAssignPickerId] = useState<string | null>(null);
  const [selectedAssignIds, setSelectedAssignIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [player, setPlayer] = useState<{ assignmentId: string; moduleId: string } | null>(
    null
  );

  useEffect(() => {
    setTrainingModules(initialModules);
    setTrainingMemberProgress(initialProgress);
    setCurrentMemberId(initialCurrentMemberId);
    setMine(initialMine);
  }, [initialModules, initialProgress, initialCurrentMemberId, initialMine]);

  const totalAssigned = trainingModules.reduce((s, m) => s + m.total, 0);
  const totalCompleted = trainingModules.reduce((s, m) => s + m.completed, 0);
  const overallPct =
    totalAssigned === 0 ? 0 : Math.round((totalCompleted / totalAssigned) * 100);
  const atRisk = trainingModules.filter(
    (m) => m.status === "At risk" || m.status === "Overdue"
  ).length;
  const complete = trainingModules.filter((m) => m.status === "Complete").length;
  const overdueMembers = trainingMemberProgress.filter((m) => m.overdue > 0);
  const overdueAssignments = useMemo(
    () =>
      trainingMemberProgress.reduce(
        (n, m) => n + (m.assignments?.filter((a) => a.status === "Overdue").length ?? m.overdue),
        0
      ),
    [trainingMemberProgress]
  );

  const myOpen = mine.assignments.filter((a) => a.status !== "Complete");
  const myDone = mine.assignments.filter((a) => a.status === "Complete");

  function refresh() {
    router.refresh();
  }

  async function createModule() {
    if (!moduleForm.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiPost<TrainingModuleProp>("/api/v1/training/modules", {
        name: moduleForm.name,
        description: moduleForm.description,
        framework: moduleForm.framework,
        durationMin: moduleForm.durationMin,
        dueAt: moduleForm.dueAt || undefined,
        assignToAll: moduleForm.assignToAll,
        memberIds: moduleForm.assignToAll ? undefined : moduleForm.memberIds,
      });
      setShowAssign(false);
      setModuleForm(emptyModuleForm);
      setMessage({ type: "success", text: "Module created" });
      refresh();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to create module",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editingId || !moduleForm.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/training/modules/${editingId}`, {
        name: moduleForm.name,
        description: moduleForm.description,
        framework: moduleForm.framework,
        durationMin: moduleForm.durationMin,
        dueAt: moduleForm.dueAt || null,
      });
      setEditingId(null);
      setModuleForm(emptyModuleForm);
      setMessage({ type: "success", text: "Module updated" });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(moduleId: string, name: string) {
    if (!window.confirm(`Delete module “${name}” and all assignments?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiDelete(`/api/v1/training/modules/${moduleId}`);
      setMessage({ type: "success", text: "Module deleted" });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      setSaving(false);
    }
  }

  async function assignModule(moduleId: string, memberIds?: string[]) {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPost<{ created: number }>(
        `/api/v1/training/modules/${moduleId}/assign`,
        memberIds?.length ? { memberIds } : { all: true }
      );
      setAssignPickerId(null);
      setSelectedAssignIds([]);
      setMessage({
        type: "success",
        text:
          result.created > 0
            ? `Assigned to ${result.created} new member${result.created === 1 ? "" : "s"}`
            : "Everyone selected is already assigned",
      });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Assign failed" });
    } finally {
      setSaving(false);
    }
  }

  async function updateAssignment(
    assignmentId: string,
    status: "COMPLETE" | "IN_PROGRESS",
    opts?: { force?: boolean }
  ) {
    setSaving(true);
    setMessage(null);
    try {
      await apiPatch(`/api/v1/training/assignments/${assignmentId}`, {
        status,
        ...(opts?.force ? { force: true } : {}),
      });
      setMessage({
        type: "success",
        text: status === "COMPLETE" ? "Marked complete" : "Marked in progress",
      });
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Update failed" });
    } finally {
      setSaving(false);
    }
  }

  function openCourse(assignmentId: string, moduleId: string) {
    setPlayer({ assignmentId, moduleId });
  }

  async function exportReport() {
    setExporting(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob(
        "/api/v1/training/export",
        "training-report.csv"
      );
      downloadBlob(blob, filename);
      setMessage({ type: "success", text: "Training completion CSV downloaded" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  async function downloadCertificate(assignmentId: string) {
    setSaving(true);
    setMessage(null);
    try {
      const { blob, filename } = await apiGetBlob(
        `/api/v1/training/certificates/${assignmentId}`,
        `training-certificate-${assignmentId}.html`
      );
      downloadBlob(blob, filename);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Certificate unavailable",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendReminders() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPost<{
        recipients: number;
        assignmentCount: number;
        sent: number;
        failed: number;
        emailConfigured: boolean;
      }>("/api/v1/training/reminders", {});
      if (result.recipients === 0) {
        setMessage({ type: "success", text: "No overdue assignments to remind" });
      } else if (!result.emailConfigured) {
        setMessage({
          type: "error",
          text: `Found ${result.recipients} overdue member(s) but RESEND_API_KEY is not configured`,
        });
      } else if (result.sent > 0) {
        setMessage({
          type: "success",
          text: `Sent ${result.sent} reminder email${result.sent === 1 ? "" : "s"} (${result.assignmentCount} assignments)${
            result.failed ? ` · ${result.failed} failed` : ""
          }`,
        });
      } else {
        setMessage({
          type: "error",
          text: `Could not send reminders (${result.failed} failed). Check Resend domain/API key.`,
        });
      }
      refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Reminders failed" });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(m: TrainingModuleProp) {
    setShowAssign(false);
    setEditingId(m.id);
    setModuleForm({
      name: m.name,
      description: m.description,
      framework: m.framework ?? "SOC 2 CC1.4",
      durationMin: m.durationMin ?? (Number.parseInt(m.duration, 10) || 30),
      dueAt: m.due ?? "",
      assignToAll: true,
      memberIds: [],
    });
  }

  function toggleMember(id: string) {
    setModuleForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter((x) => x !== id)
        : [...f.memberIds, id],
    }));
  }

  return (
    <div className="comply-page">
      {player ? (
        <CoursePlayer
          assignmentId={player.assignmentId}
          moduleId={player.moduleId}
          onClose={() => setPlayer(null)}
          onCompleted={() => {
            setPlayer(null);
            setMessage({ type: "success", text: "Course completed — certificate is available" });
            refresh();
          }}
        />
      ) : null}

      <PageHeader
        eyebrow="People"
        title="Training"
        description="Take real security courses (lessons + quiz), track team completion, send reminders, and export audit evidence."
      >
        <ComplyButton
          variant="primary"
          className="gap-1.5 text-sm"
          onClick={() => {
            setEditingId(null);
            setModuleForm(emptyModuleForm);
            setShowAssign(true);
          }}
        >
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
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {showAssign || editingId ? (
        <Card elevated>
          <CardHeader title={editingId ? "Edit training module" : "New training module"} />
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
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                className="comply-input w-full"
                placeholder="Framework (e.g. SOC 2 CC1.4)"
                value={moduleForm.framework}
                onChange={(e) => setModuleForm((f) => ({ ...f, framework: e.target.value }))}
              />
              <input
                type="number"
                min={5}
                max={480}
                className="comply-input w-full"
                placeholder="Duration (minutes)"
                value={moduleForm.durationMin}
                onChange={(e) =>
                  setModuleForm((f) => ({
                    ...f,
                    durationMin: Number(e.target.value) || 30,
                  }))
                }
              />
              <input
                type="date"
                className="comply-input w-full"
                value={moduleForm.dueAt}
                onChange={(e) => setModuleForm((f) => ({ ...f, dueAt: e.target.value }))}
              />
            </div>

            {!editingId ? (
              <div className="space-y-2 rounded-md border border-white/[0.08] p-3">
                <label className="flex items-center gap-2 text-sm text-comply-text-secondary">
                  <input
                    type="checkbox"
                    checked={moduleForm.assignToAll}
                    onChange={(e) =>
                      setModuleForm((f) => ({ ...f, assignToAll: e.target.checked }))
                    }
                  />
                  Assign to all members
                </label>
                {!moduleForm.assignToAll ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {trainingMemberProgress.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 text-xs text-comply-text-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={moduleForm.memberIds.includes(m.id)}
                          onChange={() => toggleMember(m.id)}
                        />
                        {m.name}{" "}
                        <span className="text-comply-text-tertiary">({m.email})</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <ComplyButton
                variant="primary"
                disabled={saving}
                onClick={() => void (editingId ? saveEdit() : createModule())}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : moduleForm.assignToAll
                      ? "Create & assign to all"
                      : "Create & assign selected"}
              </ComplyButton>
              <ComplyButton
                variant="secondary"
                onClick={() => {
                  setShowAssign(false);
                  setEditingId(null);
                  setModuleForm(emptyModuleForm);
                }}
              >
                Cancel
              </ComplyButton>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {mine.assignments.length > 0 ? (
        <Card elevated>
          <CardHeader title="My training" />
          <CardBody className="space-y-3">
            {myOpen.length === 0 ? (
              <p className="text-sm text-comply-green">
                You&apos;re caught up — all assigned modules are complete.
              </p>
            ) : (
              myOpen.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 rounded-md border border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-comply-text-primary">{a.module.name}</p>
                    <p className="mt-1 text-xs text-comply-text-secondary">
                      {a.module.description || "No description"} · {a.module.duration}
                      {a.module.lessonCount
                        ? ` · ${a.module.lessonCount} lessons`
                        : ""}
                      {a.module.due ? ` · due ${a.module.due}` : ""} · {a.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.module.hasCourse ? (
                      <ComplyButton
                        variant="primary"
                        className="text-xs"
                        disabled={saving}
                        onClick={() => openCourse(a.id, a.module.id)}
                      >
                        {a.status === "Not started" || a.status === "Overdue"
                          ? "Take course"
                          : "Continue course"}
                      </ComplyButton>
                    ) : (
                      <ComplyButton
                        variant="primary"
                        className="text-xs"
                        disabled={saving}
                        onClick={() => void updateAssignment(a.id, "COMPLETE")}
                      >
                        Mark complete
                      </ComplyButton>
                    )}
                  </div>
                </div>
              ))
            )}
            {myDone.length > 0 ? (
              <div className="space-y-2 pt-2">
                <SectionLabel>Completed certificates</SectionLabel>
                {myDone.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 text-sm text-comply-text-secondary"
                  >
                    <span>
                      {a.module.name}
                      {a.completedAt
                        ? ` · ${new Date(a.completedAt).toLocaleDateString()}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      className="inline-flex items-center gap-1 text-xs font-medium text-comply-purple-border hover:underline disabled:opacity-50"
                      onClick={() => void downloadCertificate(a.id)}
                    >
                      <IconCertificate size={14} />
                      Certificate
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
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
                Maps to SOC 2 CC1.4 and HIPAA workforce requirements. Export CSV sign-off logs and
                per-person completion certificates for auditors.
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
          <ProgressBar
            label="Organization progress"
            value={overallPct}
            suffix={`${overallPct}%`}
            variant="green"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Modules" value={String(trainingModules.length)} accent="purple" />
        <StatCard label="Complete" value={String(complete)} accent="green" />
        <StatCard label="At risk / overdue" value={String(atRisk)} accent="amber" />
        <StatCard label="Overdue (people)" value={String(overdueMembers.length)} accent="red" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trainingModules.map((m) => {
          const pct = m.total === 0 ? 0 : Math.round((m.completed / m.total) * 100);
          return (
            <Card key={m.id} elevated={m.status === "At risk" || m.status === "Overdue"}>
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
                <p className="mt-1 text-xs leading-relaxed text-comply-text-secondary">
                  {m.description}
                </p>
                {m.hasCourse ? (
                  <p className="mt-2 text-[11px] font-medium text-comply-purple-border">
                    Interactive course · {m.lessonCount ?? 0} lessons + quiz
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-comply-text-tertiary">Custom module (no lessons)</p>
                )}
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
                  <span>{m.due ? `Due ${m.due}` : "No due date"}</span>
                  <span className="font-mono text-[10px] text-comply-purple-border">
                    {m.framework ?? "General"}
                  </span>
                </div>

                {assignPickerId === m.id ? (
                  <div className="mt-4 space-y-2 rounded-md border border-white/[0.08] p-3">
                    <p className="text-xs text-comply-text-secondary">Select members to assign</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {trainingMemberProgress.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-2 text-xs text-comply-text-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignIds.includes(member.id)}
                            onChange={() =>
                              setSelectedAssignIds((prev) =>
                                prev.includes(member.id)
                                  ? prev.filter((x) => x !== member.id)
                                  : [...prev, member.id]
                              )
                            }
                          />
                          {member.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ComplyButton
                        variant="primary"
                        className="text-xs"
                        disabled={saving || selectedAssignIds.length === 0}
                        onClick={() => void assignModule(m.id, selectedAssignIds)}
                      >
                        Assign selected
                      </ComplyButton>
                      <ComplyButton
                        variant="secondary"
                        className="text-xs"
                        disabled={saving}
                        onClick={() => void assignModule(m.id)}
                      >
                        Assign all
                      </ComplyButton>
                      <ComplyButton
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setAssignPickerId(null);
                          setSelectedAssignIds([]);
                        }}
                      >
                        Cancel
                      </ComplyButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ComplyButton
                      variant="secondary"
                      className="flex-1 text-xs"
                      disabled={saving}
                      onClick={() => {
                        setAssignPickerId(m.id);
                        setSelectedAssignIds([]);
                      }}
                    >
                      Assign
                    </ComplyButton>
                    <ComplyButton
                      variant="ghost"
                      className="text-xs"
                      disabled={saving}
                      onClick={() => startEdit(m)}
                      aria-label={`Edit ${m.name}`}
                    >
                      <IconPencil size={14} />
                    </ComplyButton>
                    <ComplyButton
                      variant="ghost"
                      className="text-xs text-comply-red"
                      disabled={saving}
                      onClick={() => void deleteModule(m.id, m.name)}
                      aria-label={`Delete ${m.name}`}
                    >
                      <IconTrash size={14} />
                    </ComplyButton>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card elevated>
        <CardHeader
          title="Completion by member"
          action={
            <ComplyButton
              variant="ghost"
              className="gap-1 text-xs"
              disabled={saving || overdueAssignments === 0}
              onClick={() => void sendReminders()}
            >
              <IconSend size={14} />
              {overdueAssignments === 0
                ? "No reminders due"
                : `Send reminders (${overdueMembers.length})`}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainingMemberProgress.map((m) => {
                const pct = m.total === 0 ? 0 : Math.round((m.completed / m.total) * 100);
                const incomplete =
                  m.assignments?.filter((a) => a.status !== "Complete") ?? [];
                const completedAssignments =
                  m.assignments?.filter((a) => a.status === "Complete") ?? [];
                return (
                  <tr key={m.id}>
                    <td className="font-medium">
                      {m.name}
                      {currentMemberId === m.id ? (
                        <span className="ml-1 text-[10px] text-comply-purple-border">(you)</span>
                      ) : null}
                    </td>
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
                      <div className="flex max-w-[260px] flex-col items-start gap-1">
                        {incomplete.map((a) => {
                          const mod = trainingModules.find((x) => x.id === a.moduleId);
                          const hasCourse = Boolean(mod?.hasCourse);
                          const isMine = currentMemberId === m.id;
                          return (
                            <div key={a.id} className="flex flex-wrap items-center gap-2">
                              {hasCourse && isMine ? (
                                <button
                                  type="button"
                                  disabled={saving}
                                  className="text-left text-xs font-medium text-comply-purple-border hover:underline disabled:opacity-50"
                                  onClick={() => openCourse(a.id, a.moduleId)}
                                >
                                  Take {a.moduleName ?? "course"}
                                </button>
                              ) : hasCourse ? (
                                <button
                                  type="button"
                                  disabled={saving}
                                  className="text-left text-xs font-medium text-comply-text-tertiary hover:text-comply-purple-border disabled:opacity-50"
                                  onClick={() =>
                                    void updateAssignment(a.id, "COMPLETE", { force: true })
                                  }
                                  title="Admin override — skips quiz"
                                >
                                  Force complete {a.moduleName ?? "module"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={saving}
                                  className="text-left text-xs font-medium text-comply-purple-border hover:underline disabled:opacity-50"
                                  onClick={() => void updateAssignment(a.id, "COMPLETE")}
                                >
                                  Complete {a.moduleName ?? "module"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {completedAssignments.slice(0, 2).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            disabled={saving}
                            className="inline-flex items-center gap-1 text-left text-[11px] text-comply-text-tertiary hover:text-comply-purple-border disabled:opacity-50"
                            onClick={() => void downloadCertificate(a.id)}
                          >
                            <IconCertificate size={12} />
                            {a.moduleName ?? "Certificate"}
                          </button>
                        ))}
                        {incomplete.length === 0 && completedAssignments.length === 0 ? (
                          <span className="text-xs text-comply-text-tertiary">—</span>
                        ) : null}
                      </div>
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
            Download a CSV completion / sign-off log for SOC 2 CC1.4. Individual HTML certificates
            are available per completed assignment above.
          </p>
        </div>
        <ComplyButton
          variant="secondary"
          className="text-sm"
          disabled={exporting}
          onClick={() => void exportReport()}
        >
          {exporting ? "Exporting…" : "Export completion CSV"}
        </ComplyButton>
      </div>
    </div>
  );
}
