"use client";

import Link from "next/link";
import { BrowserChrome } from "@/components/comply/browser-chrome";
import { StepIndicator } from "@/components/comply/step-indicator";

const CLOUDS = [
  { name: "AWS", href: "/integrations" },
  { name: "Azure", href: "/integrations" },
  { name: "GCP", href: "/integrations" },
];

export default function OnboardingConnectCloudPage() {
  return (
    <BrowserChrome url="app.vikela.com/onboarding/connect-cloud" contentClassName="px-8 py-6">
      <StepIndicator currentStep={1} />

      <h1 className="text-center text-sm font-medium text-comply-text-primary">
        Connect cloud infrastructure
      </h1>
      <p className="mt-1 max-w-md text-center text-xs text-comply-text-secondary">
        AWS uses cross-account IAM AssumeRole — Vikela never stores your root credentials.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CLOUDS.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="rounded-md border border-[var(--border)] bg-comply-card px-4 py-2 text-xs font-medium text-comply-text-primary hover:border-comply-purple-border"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="mt-8 flex w-full max-w-[480px] items-center justify-between">
        <Link href="/onboarding/connect-repos" className="text-xs text-comply-muted hover:underline">
          ← Back
        </Link>
        <Link href="/onboarding/frameworks" className="btn-purple-cta w-[120px]">
          Next →
        </Link>
      </div>
    </BrowserChrome>
  );
}
