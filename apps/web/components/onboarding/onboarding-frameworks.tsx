"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPLIANCE_FRAMEWORKS } from "@vikela/shared/framework-catalog";
import { IconCircleCheck, IconStack2 } from "@tabler/icons-react";
import { StepIndicator } from "@/components/comply/step-indicator";
import { apiGet, apiPut } from "@/lib/api";
import { cn } from "@/lib/utils";

type FrameworkRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  controlCount: number;
  enrolled: boolean;
};

type FrameworkOption = FrameworkRow & {
  tagline: string;
  recommended?: boolean;
  isNew?: boolean;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

function FrameworkToggle({
  fw,
  selected,
  onToggle,
}: {
  fw: FrameworkOption;
  selected: boolean;
  onToggle: (slug: string) => void;
}) {
  const ready = fw.controlCount > 0;

  return (
    <button
      type="button"
      onClick={() => onToggle(fw.slug)}
      className={cn(
        "relative flex w-full flex-col rounded-md border px-4 py-3 text-left transition-all duration-200",
        selected
          ? "border-comply-purple-border/60 bg-comply-purple/15 shadow-[0_0_20px_-8px_rgba(83,74,183,0.45)]"
          : "border-white/[0.08] bg-black/25 hover:border-white/[0.14]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-comply-text-primary">{fw.tagline}</span>
        <span
          className={cn(
            "shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            selected
              ? "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)]"
              : "border-white/[0.1] text-comply-muted"
          )}
        >
          {selected ? "On" : "Add"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-comply-text-secondary">{fw.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
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
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[9px]",
            ready ? "bg-comply-green/10 text-comply-green" : "bg-white/[0.04] text-comply-muted"
          )}
        >
          {ready ? `${fw.controlCount} controls ready` : "Enable to track controls"}
        </span>
      </div>
    </button>
  );
}

export function OnboardingFrameworks() {
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<FrameworkOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(["soc2"]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiGet<FrameworkRow[]>("/api/v1/frameworks");
      const ordered = COMPLIANCE_FRAMEWORKS.map((cat) => {
        const row = rows.find((r) => r.slug === cat.slug);
        if (!row) return null;
        return {
          ...row,
          tagline: cat.tagline,
          recommended: cat.recommended,
          isNew: cat.isNew,
        } satisfies FrameworkOption;
      }).filter(Boolean) as FrameworkOption[];

      setFrameworks(ordered);
      const preselected = new Set(
        ordered.filter((f) => f.enrolled).map((f) => f.slug)
      );
      if (preselected.size === 0) preselected.add("soc2");
      setSelected(preselected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load frameworks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const selectRecommended = () => {
    setSelected(
      new Set(COMPLIANCE_FRAMEWORKS.filter((f) => f.recommended).map((f) => f.slug))
    );
  };

  const selectAll = () => {
    setSelected(new Set(frameworks.map((f) => f.slug)));
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/api/v1/onboarding/framework-selection", {
        slugs: [...selected],
      });
      router.push("/onboarding/team");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save framework selection");
    } finally {
      setSaving(false);
    }
  };

  const canContinue = selected.size > 0;

  return (
    <div className="flex w-full max-w-5xl flex-col items-center lg:flex-row lg:items-start lg:justify-center lg:gap-16 xl:gap-24">
      <div className="mb-12 max-w-md lg:mb-0 lg:flex-1">
        <SectionLabel>Onboarding · Step 2 of 3</SectionLabel>
        <h1 className="mt-4 font-display text-2xl font-semibold text-comply-text-primary text-balance sm:text-3xl">
          Pick your compliance frameworks
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-comply-text-secondary">
          Enable every standard you need today, or add FedRAMP, CMMC, and PCI when contracts require
          them. All frameworks share the same control graph; you&apos;re not rebuilding your program
          each time.
        </p>
        <ul className="mt-8 space-y-3">
          {[
            "All ten frameworks included on every plan",
            "Start with SOC 2; expand without re-onboarding",
            "Controls map once across HIPAA, ISO, GDPR, and more",
          ].map((line) => (
            <li key={line} className="flex gap-2.5 text-xs leading-relaxed text-comply-text-secondary">
              <IconCircleCheck size={15} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
              {line}
            </li>
          ))}
        </ul>
        <div className="marketing-panel relative mt-8 p-4">
          <div className="flex items-center gap-2 text-comply-text-tertiary">
            <IconStack2 size={16} stroke={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Tip</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-comply-text-secondary">
            Frameworks marked &quot;controls coming soon&quot; are enabled on your workspace now, full
            control libraries roll out without losing your selection.
          </p>
        </div>
      </div>

      <div className="marketing-panel marketing-panel-highlight relative w-full max-w-[520px] p-8">
        <StepIndicator currentStep={2} />

        <h2 className="relative mt-2 text-center text-xl font-medium tracking-tight text-comply-text-primary">
          Which frameworks do you need?
        </h2>
        <p className="relative mt-1.5 text-center text-sm text-comply-text-secondary">
          Select all that apply. Change anytime from Frameworks in the app.
        </p>

        <div className="relative mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={selectRecommended}
            className="rounded-md border border-white/[0.1] px-2.5 py-1 text-[10px] text-comply-text-secondary hover:text-comply-text-primary"
          >
            Select popular
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="rounded-md border border-white/[0.1] px-2.5 py-1 text-[10px] text-comply-text-secondary hover:text-comply-text-primary"
          >
            Select all
          </button>
        </div>

        {error && (
          <p className="relative mt-4 rounded-md border border-red-900/40 bg-red-950/30 px-3 py-2 text-center text-xs text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="relative mt-8 flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-comply-purple-border/30 border-t-comply-purple" />
          </div>
        ) : (
          <div className="relative mt-5 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {frameworks.map((fw) => (
              <FrameworkToggle
                key={fw.slug}
                fw={fw}
                selected={selected.has(fw.slug)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}

        <p className="relative mt-4 text-center text-[11px] text-comply-muted">
          {selected.size} selected · {frameworks.filter((f) => selected.has(f.slug) && f.controlCount > 0).length}{" "}
          with live controls
        </p>

        <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <button
            type="button"
            onClick={() => router.push("/onboarding/connect-repos")}
            className="text-xs text-comply-muted hover:text-comply-text-secondary"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue || saving || loading}
            className="btn-purple-cta flex h-10 min-w-[120px] items-center justify-center px-4 text-sm font-medium disabled:opacity-40"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFrameworks;
