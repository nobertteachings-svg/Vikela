import Link from "next/link";
import { IconLock, IconRocket } from "@tabler/icons-react";

const FEATURE_COPY = {
  copilot: {
    title: "Vikela Copilot is on Growth",
    body: "AI remediation, grounded answers, and gap explanations unlock on Growth. Built for teams closing audits and security questionnaires without a GRC hire.",
  },
  questionnaires: {
    title: "Security questionnaires are on Growth",
    body: "Generate and complete customer security questionnaires from your live posture. Available on Growth and Enterprise.",
  },
  policy_generator: {
    title: "Policy generator is on Growth",
    body: "Draft auditor-ready policies from your gaps and stack. Unlock on Growth when you’re ready to ship the program, not just the scan.",
  },
  evidence_exports: {
    title: "Auditor exports are on Growth",
    body: "Package evidence for your audit period and share with auditors. Available on Growth and Enterprise.",
  },
} as const;

export type GatedFeature = keyof typeof FEATURE_COPY;

export function PlanUpgradePanel({
  feature,
  currentPlan,
}: {
  feature: GatedFeature;
  currentPlan?: string;
}) {
  const copy = FEATURE_COPY[feature];
  return (
    <div className="marketing-panel marketing-panel-highlight mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border">
        <IconLock size={22} stroke={1.5} />
      </span>
      <h2 className="mt-5 text-lg font-medium tracking-tight text-comply-text-primary">
        {copy.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-comply-text-secondary">{copy.body}</p>
      {currentPlan ? (
        <p className="mt-2 text-xs text-comply-muted">
          Current plan: <span className="font-mono uppercase">{currentPlan}</span>
        </p>
      ) : null}
      <Link
        href="/billing"
        className="btn-purple-cta mt-6 inline-flex h-10 items-center gap-2 px-5 text-sm"
      >
        <IconRocket size={16} stroke={1.75} />
        View Growth pricing
      </Link>
    </div>
  );
}
