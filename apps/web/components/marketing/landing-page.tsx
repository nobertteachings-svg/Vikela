"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconBrandAws,
  IconBrandAzure,
  IconBrandBitbucket,
  IconBrandGithub,
  IconBrandGitlab,
  IconBrandGoogle,
  IconFingerprint,
  IconCircleCheck,
  IconCloud,
  IconCode,
  IconFileCertificate,
  IconShieldCheck,
} from "@tabler/icons-react";
import { LogoPill } from "@/components/comply/logo-pill";
import { MarketingAuthLinks } from "@/components/marketing/marketing-auth-links";
import { enterpriseFooterCopy, landingPlans } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  { id: "soc2", name: "SOC 2", weight: 28 },
  { id: "soc1", name: "SOC 1", weight: 18 },
  { id: "soc3", name: "SOC 3", weight: 16 },
  { id: "hipaa", name: "HIPAA", weight: 24 },
  { id: "iso27001", name: "ISO 27001", weight: 26 },
  { id: "iso42001", name: "ISO 42001", weight: 20 },
  { id: "gdpr", name: "GDPR", weight: 22 },
  { id: "pci", name: "PCI DSS", weight: 25 },
  { id: "fedramp", name: "FedRAMP", weight: 30 },
  { id: "cmmc", name: "CMMC", weight: 27 },
] as const;

const INTEGRATION_GROUPS = [
  {
    label: "Source control",
    items: [
      { name: "GitHub", icon: IconBrandGithub },
      { name: "GitLab", icon: IconBrandGitlab },
      { name: "Bitbucket", icon: IconBrandBitbucket },
    ],
  },
  {
    label: "Cloud",
    items: [
      { name: "AWS", icon: IconBrandAws },
      { name: "Azure", icon: IconBrandAzure },
      { name: "Google Cloud", icon: IconBrandGoogle },
    ],
  },
  {
    label: "Identity",
    items: [
      { name: "Okta", icon: IconFingerprint },
      { name: "Azure AD", icon: IconBrandAzure },
      { name: "Google Workspace", icon: IconBrandGoogle },
    ],
  },
] as const;

const STEPS = [
  {
    icon: IconCloud,
    title: "Connect your stack",
    description:
      "Link GitHub, GitLab, or Bitbucket with AWS, Azure, GCP, and identity. Most teams finish the first connection in under 10 minutes.",
    demo: "GitHub connected · AWS AssumeRole ready · Okta synced",
  },
  {
    icon: IconShieldCheck,
    title: "See mapped gaps",
    description:
      "Findings map to SOC 2, ISO 27001, HIPAA, and the rest, with context so you know what to fix first.",
    demo: "12 open gaps · 4 critical · mapped across selected frameworks",
  },
  {
    icon: IconFileCertificate,
    title: "Close the questionnaire",
    description:
      "Draft answers from live posture, generate policies, and export evidence when you are ready for review.",
    demo: "48 of 62 answers drafted from live controls",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Is my data safe with Vikela?",
    a: "Provider tokens are encrypted at rest (AES-256-GCM). AWS connections use AssumeRole, not long lived keys. Access stays scoped to your workspace. See the Security page for current controls.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect a first integration in under 10 minutes and see mapped gaps soon after. Full audit readiness still depends on your starting posture.",
  },
  {
    q: "What if I hit a check or seat limit?",
    a: "Plan limits show an upgrade prompt in product. There are no surprise overage invoices. Upgrade when you need capacity, or wait for the next cycle where check limits reset.",
  },
  {
    q: "Can I add frameworks later?",
    a: "Yes. Enable the packs you need now and add FedRAMP, CMMC, or ISO 42001 when a contract requires them, without rebuilding your program.",
  },
  {
    q: "Do I need a compliance hire?",
    a: "No. Founders and eng leads typically run Vikela themselves. You still need an external auditor for a formal SOC 2 or ISO attestation.",
  },
  {
    q: "Is Vikela a replacement for an auditor?",
    a: "No. Vikela gets you ready: gaps mapped, evidence collected, questionnaires answered. A licensed firm still issues the report.",
  },
] as const;

const GREEN_CTA =
  "inline-flex h-10 items-center justify-center rounded-md bg-comply-green px-5 text-sm font-medium text-comply-green-light transition-opacity hover:opacity-90";

export function LandingPage() {
  const [selected, setSelected] = useState<string[]>(["soc2", "hipaa", "iso27001"]);
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<string | null>(FAQ_ITEMS[0]?.q ?? null);

  const readiness = useMemo(() => {
    if (selected.length === 0) return 42;
    const total = selected.reduce((sum, id) => {
      const fw = FRAMEWORKS.find((f) => f.id === id);
      return sum + (fw?.weight ?? 20);
    }, 0);
    const avg = total / selected.length;
    return Math.min(92, Math.round(38 + avg * 1.4 + selected.length * 3));
  }, [selected]);

  const gapCount = useMemo(() => {
    if (selected.length === 0) return 0;
    return Math.max(4, 22 - selected.length * 2 + (100 - readiness) / 4);
  }, [selected.length, readiness]);

  function toggleFramework(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-comply-text-primary antialiased">
      <header className="relative z-10 border-b border-white/[0.08] bg-[var(--bg-app)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-comply-text-secondary md:flex">
            <a href="#frameworks" className="hover:text-comply-text-primary">
              Frameworks
            </a>
            <a href="#how" className="hover:text-comply-text-primary">
              How it works
            </a>
            <a href="#pricing" className="hover:text-comply-text-primary">
              Pricing
            </a>
            <a href="#faq" className="hover:text-comply-text-primary">
              FAQ
            </a>
          </nav>
          <MarketingAuthLinks compact />
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-14 pt-16 sm:pt-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="max-w-xl text-2xl font-semibold tracking-tight text-comply-text-primary sm:text-3xl">
                Get audit ready in weeks, not months
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-comply-text-secondary">
                Map code, cloud, and identity into the frameworks buyers ask for. Answer the
                security questionnaire from live controls, not a blank spreadsheet.
              </p>
              <div className="mt-7">
                <MarketingAuthLinks />
              </div>
            </div>

            <div className="rounded-md border border-white/[0.1] bg-black/25 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-comply-text-secondary">
                  Try a readiness preview
                </p>
                <span className="font-mono text-xs text-comply-green">
                  {selected.length} frameworks
                </span>
              </div>
              <p className="mt-4 font-mono text-4xl font-semibold tabular-nums text-comply-text-primary">
                {readiness}
                <span className="text-lg text-comply-text-tertiary">%</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-comply-green transition-all duration-500 ease-out"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-comply-text-tertiary">
                About {Math.round(gapCount)} illustrative gaps after a first scan. Click frameworks
                below to reshape the preview.
              </p>
              <Link href="/sign-up" className={cn(GREEN_CTA, "mt-5 w-full")}>
                Start with these frameworks
              </Link>
            </div>
          </div>
        </section>

        <section id="frameworks" className="border-y border-white/[0.08] bg-black/20 py-10">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-sm font-medium text-comply-text-primary">
              Pick the frameworks your deal asks for
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-comply-text-secondary">
              Toggle packs on one control graph. Enable more later without rebuilding the program.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw) => {
                const on = selected.includes(fw.id);
                return (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => toggleFramework(fw.id)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex items-center rounded-sm border px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-tight transition-colors",
                      on
                        ? "border-comply-green/50 bg-comply-green/20 text-comply-green-light"
                        : "border-white/[0.1] bg-white/[0.03] text-comply-text-secondary hover:border-white/20 hover:text-comply-text-primary"
                    )}
                  >
                    {on ? "✓ " : ""}
                    {fw.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-lg font-semibold tracking-tight text-comply-text-primary">
            How it works
          </h2>
          <p className="mt-2 text-sm text-comply-text-secondary">
            Click a step to see what shows up in the product.
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <ol className="space-y-2">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const active = activeStep === i;
                return (
                  <li key={step.title}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(i)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-comply-green/40 bg-comply-green/10"
                          : "border-white/[0.08] bg-black/15 hover:border-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                          active
                            ? "border-comply-green/40 text-comply-green"
                            : "border-white/[0.1] text-comply-text-tertiary"
                        )}
                      >
                        <Icon size={16} stroke={1.5} />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-comply-text-primary">
                          {String(i + 1).padStart(2, "0")}. {step.title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-comply-text-secondary">
                          {step.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="rounded-md border border-white/[0.1] bg-black/25 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-comply-text-tertiary">
                Live product cue
              </p>
              <p className="mt-3 text-sm font-medium text-comply-text-primary">
                {STEPS[activeStep].title}
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-comply-green">
                {STEPS[activeStep].demo}
              </p>
              <div className="mt-6 space-y-2">
                {[72, 54, 81].map((w, i) => (
                  <div key={i} className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        activeStep === i ? "bg-comply-green" : "bg-white/20"
                      )}
                      style={{ width: `${activeStep === i ? w + 12 : w}%` }}
                    />
                  </div>
                ))}
              </div>
              <Link href="/sign-up" className={cn(GREEN_CTA, "mt-6")}>
                Run your first check
              </Link>
            </div>
          </div>
        </section>

        <section id="integrations" className="border-t border-white/[0.08] py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-lg font-semibold tracking-tight text-comply-text-primary">
              Evidence from the stack auditors review
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-comply-text-secondary">
              IAM, branch protection, MFA, and cloud config, not only application code.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {INTEGRATION_GROUPS.map((group) => (
                <div
                  key={group.label}
                  className="rounded-md border border-white/[0.08] bg-black/20 p-4 transition-colors hover:border-comply-green/30"
                >
                  <div className="flex items-center gap-2 text-comply-text-tertiary">
                    {group.label === "Source control" && <IconCode size={16} stroke={1.5} />}
                    {group.label === "Cloud" && <IconCloud size={16} stroke={1.5} />}
                    {group.label === "Identity" && <IconShieldCheck size={16} stroke={1.5} />}
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {group.label}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.name}>
                          <span className="flex items-center gap-3 rounded-sm px-1 py-1.5 text-sm text-comply-text-primary transition-colors hover:bg-white/[0.04]">
                            <Icon size={16} className="text-comply-text-secondary" stroke={1.5} />
                            {item.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-white/[0.08] py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-lg font-semibold tracking-tight text-comply-text-primary">
              Pricing
            </h2>
            <p className="mt-2 max-w-lg text-sm text-comply-text-secondary">
              Published list prices. Upgrade when a deal needs more capacity.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {landingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex flex-col rounded-md border border-white/[0.1] bg-black/20 p-5 transition-colors hover:border-comply-green/35",
                    plan.highlight && "border-comply-green/45 bg-comply-green/10"
                  )}
                >
                  <h3 className="text-sm font-medium text-comply-text-secondary">{plan.name}</h3>
                  <p className="mt-3 font-mono text-2xl tracking-tight text-comply-text-primary">
                    {plan.price}
                    <span className="text-sm font-sans font-normal text-comply-text-tertiary">
                      {plan.period}
                    </span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-comply-text-secondary">
                        <IconCircleCheck
                          size={16}
                          className="mt-0.5 shrink-0 text-comply-green"
                          stroke={2}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up" className={cn(GREEN_CTA, "mt-6 w-full")}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-comply-muted">
              Cancel anytime. Annual billing saves about 17%.
            </p>
            <p className="mt-3 text-center text-sm text-comply-text-secondary">
              {enterpriseFooterCopy}{" "}
              <a
                href="mailto:hello@vikela.com"
                className="font-medium text-comply-green hover:underline"
              >
                Contact sales
              </a>
            </p>
          </div>
        </section>

        <section id="faq" className="border-t border-white/[0.08] py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-lg font-semibold tracking-tight text-comply-text-primary">FAQ</h2>
            <div className="mt-10 space-y-2">
              {FAQ_ITEMS.map((item) => {
                const open = openFaq === item.q;
                return (
                  <div
                    key={item.q}
                    className={cn(
                      "rounded-md border bg-black/15",
                      open ? "border-comply-green/35" : "border-white/[0.1]"
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm font-medium text-comply-text-primary"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : item.q)}
                    >
                      {item.q}
                      <span className="font-mono text-comply-text-tertiary">{open ? "−" : "+"}</span>
                    </button>
                    {open ? (
                      <p className="border-t border-white/[0.06] px-4 pb-4 pt-3 text-sm leading-relaxed text-comply-text-secondary">
                        {item.a}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-comply-text-primary">
                Got the questionnaire? See your gaps today.
              </h2>
            </div>
            <Link href="/sign-up" className={cn(GREEN_CTA, "px-6")}>
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <LogoPill />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-comply-muted">
              Compliance automation for startups closing enterprise deals.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-comply-muted">
            <Link href="/privacy" className="hover:text-comply-text-secondary">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-comply-text-secondary">
              Terms
            </Link>
            <Link href="/docs" className="hover:text-comply-text-secondary">
              Docs
            </Link>
            <Link href="/security" className="hover:text-comply-text-secondary">
              Security
            </Link>
            <a href="#pricing" className="hover:text-comply-text-secondary">
              Pricing
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
