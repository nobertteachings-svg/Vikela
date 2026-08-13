"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  COMPLIANCE_FRAMEWORKS,
  COMPLIANCE_FRAMEWORK_SLUGS,
} from "@vikela/shared/framework-catalog";
import { IconCircleCheck, IconStack2 } from "@tabler/icons-react";
import { Card, CardBody, CardHeader } from "@/components/comply/card";
import { ProgressBar } from "@/components/comply/progress-bar";
import { useOrgRole } from "@/hooks/use-org-role";
import { apiDelete, apiPost, apiPut } from "@/lib/api";
import type { FrameworkRow } from "@/lib/compliance-api";
import { formatFrameworkStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

type FrameworkOption = FrameworkRow & {
  tagline: string;
  recommended?: boolean;
  isNew?: boolean;
  inCatalog: boolean;
};

function mergeFrameworkOptions(initial: FrameworkRow[]): FrameworkOption[] {
  return COMPLIANCE_FRAMEWORKS.map((cat) => {
    const row = initial.find((r) => r.slug === cat.slug);
    return {
      id: row?.id ?? cat.slug,
      slug: cat.slug,
      name: cat.name,
      description: row?.description ?? cat.description,
      version: row?.version ?? cat.version,
      controlCount: row?.controlCount ?? 0,
      score: row?.score ?? 0,
      enrolled: row?.enrolled ?? false,
      status: row?.status ?? "NOT_STARTED",
      tagline: cat.tagline,
      recommended: cat.recommended,
      isNew: cat.isNew,
      inCatalog: Boolean(row),
    };
  });
}

function FrameworkChip({
  fw,
  busy,
  canManage,
  onToggle,
}: {
  fw: FrameworkOption;
  busy: boolean;
  canManage: boolean;
  onToggle: (fw: FrameworkOption) => void;
}) {
  const ready = fw.controlCount > 0;

  return (
    <button
      type="button"
      disabled={busy || !canManage || !fw.inCatalog}
      onClick={() => onToggle(fw)}
      title={
        !fw.inCatalog
          ? "Run npm run db:seed to add this framework to your workspace catalog"
          : undefined
      }
      className={cn(
        "relative flex w-full flex-col rounded-md border px-3 py-2.5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        fw.enrolled
          ? "border-comply-purple-border/60 bg-comply-purple/15 shadow-[0_0_20px_-8px_rgba(83,74,183,0.45)]"
          : "border-white/[0.08] bg-black/25 hover:border-white/[0.14]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-comply-text-primary">{fw.name}</p>
          <p className="text-[11px] text-comply-text-secondary">{fw.tagline}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            fw.enrolled
              ? "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)]"
              : "border-white/[0.1] text-comply-muted"
          )}
        >
          {fw.enrolled ? "On" : "Add"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {fw.recommended && (
          <span className="rounded-sm border border-comply-purple-border/40 bg-comply-purple/10 px-1.5 py-0.5 text-[9px] text-comply-purple-light">
            Popular
          </span>
        )}
        {fw.isNew && (
          <span className="rounded-sm border border-comply-amber-dark/40 bg-comply-amber-light/20 px-1.5 py-0.5 text-[9px] text-comply-amber-text">
            New
          </span>
        )}
        {fw.enrolled && fw.score > 0 && (
          <span className="rounded-sm bg-comply-purple/10 px-1.5 py-0.5 font-mono text-[9px] text-comply-purple-light">
            {fw.score}%
          </span>
        )}
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[9px]",
            ready ? "bg-comply-green/10 text-comply-green" : "bg-white/[0.04] text-comply-muted"
          )}
        >
          {ready ? `${fw.controlCount} controls` : "Enable to track"}
        </span>
      </div>
    </button>
  );
}

export function DashboardFrameworkPicker({
  frameworks: initial,
  lastScanAt,
}: {
  frameworks: FrameworkRow[];
  lastScanAt: string | null;
}) {
  const router = useRouter();
  const { appRole, isAuditor, isLoaded } = useOrgRole();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canManage = isLoaded && !isAuditor && appRole === "admin";

  const options = useMemo(() => mergeFrameworkOptions(initial), [initial]);
  const enrolled = useMemo(() => options.filter((f) => f.enrolled), [options]);

  const toggleOne = useCallback(
    async (fw: FrameworkOption) => {
      if (!canManage || !fw.inCatalog) return;

      setBusySlug(fw.slug);
      setMessage(null);
      try {
        if (fw.enrolled) {
          if (
            !confirm(
              `Disable ${fw.name}? Controls with evidence or shared with other frameworks will be kept.`
            )
          ) {
            setBusySlug(null);
            return;
          }
          await apiDelete(`/api/v1/frameworks/${fw.slug}/enroll`);
          setMessage(`${fw.name} disabled`);
        } else {
          const result = await apiPost<{ controlsCreated: number }>(
            `/api/v1/frameworks/${fw.slug}/enroll`
          );
          setMessage(
            result.controlsCreated > 0
              ? `${fw.name} enabled, ${result.controlsCreated} controls added`
              : `${fw.name} enabled`
          );
        }
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not update framework");
      } finally {
        setBusySlug(null);
      }
    },
    [canManage, router]
  );

  const applySelection = useCallback(
    async (slugs: string[]) => {
      if (!canManage) return;
      setBatchBusy(true);
      setMessage(null);
      try {
        await apiPut("/api/v1/onboarding/framework-selection", { slugs });
        router.refresh();
        setMessage(`Updated ${slugs.length} framework${slugs.length === 1 ? "" : "s"}`);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not update frameworks");
      } finally {
        setBatchBusy(false);
      }
    },
    [canManage, router]
  );

  const addPopular = () => {
    const popular = COMPLIANCE_FRAMEWORKS.filter((f) => f.recommended).map((f) => f.slug);
    const current = options.filter((f) => f.enrolled).map((f) => f.slug);
    void applySelection(Array.from(new Set([...current, ...popular])));
  };

  const enableAll = () => {
    void applySelection([...COMPLIANCE_FRAMEWORK_SLUGS]);
  };

  const busy = batchBusy || busySlug !== null;

  return (
    <Card>
      <CardHeader
        title="Compliance frameworks"
        action={
          <Link href="/frameworks" className="comply-link text-xs font-medium">
            View details
          </Link>
        }
      />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-comply-text-secondary">
            <IconStack2 size={18} className="mt-0.5 shrink-0 text-comply-purple-border" stroke={1.5} />
            <p className="max-w-xl leading-relaxed">
              Enable the frameworks your customers ask for. Vikela maps code, cloud, and identity
              findings into each program from one dashboard.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={addPopular}
                className="rounded-md border border-white/[0.1] px-2.5 py-1 text-xs text-comply-text-secondary transition-colors hover:border-comply-purple-border/40 hover:text-comply-text-primary disabled:opacity-50"
              >
                Add popular
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={enableAll}
                className="rounded-md border border-white/[0.1] px-2.5 py-1 text-xs text-comply-text-secondary transition-colors hover:border-comply-purple-border/40 hover:text-comply-text-primary disabled:opacity-50"
              >
                Enable all
              </button>
            </div>
          )}
        </div>

        {!canManage && isLoaded && (
          <p className="text-xs text-comply-text-tertiary">
            Only workspace admins can enable or disable frameworks.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((fw) => (
            <FrameworkChip
              key={fw.slug}
              fw={fw}
              busy={busy}
              canManage={canManage}
              onToggle={toggleOne}
            />
          ))}
        </div>

        {message && (
          <p
            className={cn(
              "flex items-center gap-1 text-xs",
              message.includes("enabled") || message.includes("Updated")
                ? "text-comply-green"
                : "text-comply-text-secondary"
            )}
          >
            {(message.includes("enabled") || message.includes("Updated")) && (
              <IconCircleCheck size={12} />
            )}
            {message}
          </p>
        )}

        {enrolled.length > 0 && (
          <div className="space-y-4 border-t border-white/[0.06] pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
              Readiness
            </p>
            {enrolled.map((fw) => (
              <ProgressBar
                key={fw.id}
                label={fw.name}
                value={fw.score}
                suffix={
                  !lastScanAt && fw.score === 0
                    ? "Not started"
                    : `${fw.score}% · ${formatFrameworkStatus(fw.status as Parameters<typeof formatFrameworkStatus>[0])}`
                }
                variant={fw.slug.includes("hipaa") ? "green" : "purple"}
              />
            ))}
          </div>
        )}

        {enrolled.length === 0 && (
          <p className="border-t border-white/[0.06] pt-4 text-sm text-comply-text-secondary">
            No frameworks enabled yet. Turn on SOC 2 or another standard above to start mapping controls.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
