import Link from "next/link";
import {
  IconArrowRight,
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
  IconLayoutDashboard,
  IconRobot,
  IconShieldCheck,
  IconStack2,
} from "@tabler/icons-react";
import { LogoPill } from "@/components/comply/logo-pill";
import { MarketingAuthLinks } from "@/components/marketing/marketing-auth-links";
import { enterpriseFooterCopy, landingPlans } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  "SOC 2",
  "SOC 1",
  "SOC 3",
  "HIPAA",
  "ISO 27001",
  "ISO 42001",
  "GDPR",
  "PCI DSS",
  "FedRAMP",
  "CMMC",
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
    label: "Cloud infrastructure",
    items: [
      { name: "AWS", icon: IconBrandAws },
      { name: "Azure", icon: IconBrandAzure },
      { name: "Google Cloud", icon: IconBrandGoogle },
    ],
  },
  {
    label: "Identity & access",
    items: [
      { name: "Okta", icon: IconFingerprint },
      { name: "Azure AD", icon: IconBrandAzure },
      { name: "Google Workspace", icon: IconBrandGoogle },
    ],
  },
] as const;

const CAPABILITIES = [
  {
    icon: IconStack2,
    title: "Continuous control mapping",
    description:
      "Findings from repos, cloud accounts, and identity providers map to the exact control requirement—across every framework you enable.",
  },
  {
    icon: IconLayoutDashboard,
    title: "Unified posture dashboard",
    description:
      "One score and readiness view per framework. Track gaps, evidence, and remediation without switching tools.",
  },
  {
    icon: IconRobot,
    title: "AI remediation & evidence",
    description:
      "Plain-language fix steps, policy drafts, and questionnaire answers grounded in your environment—not generic templates.",
  },
] as const;

const STEPS = [
  {
    icon: IconCloud,
    title: "Connect your stack",
    description:
      "Link GitHub, GitLab, or Bitbucket alongside AWS, Azure, GCP, and identity providers. Evidence collection starts on sync.",
  },
  {
    icon: IconShieldCheck,
    title: "Map gaps to controls",
    description:
      "Every finding ties to SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and the rest—with auditor-ready context.",
  },
  {
    icon: IconFileCertificate,
    title: "Close gaps and ship audits",
    description:
      "Prioritize remediation, generate policies, and export evidence packages when frameworks are ready for review.",
  },
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

function FrameworkPill({ name, featured }: { name: string; featured?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-1 font-mono text-[11px] font-medium tracking-tight",
        featured
          ? "border-comply-purple-border/60 bg-comply-purple/20 text-comply-purple-light shadow-[0_0_20px_-4px_rgba(83,74,183,0.4)]"
          : "border-white/[0.08] bg-white/[0.03] text-comply-text-secondary backdrop-blur-sm"
      )}
    >
      {name}
    </span>
  );
}

export function LandingPage() {
  return (
    <div className="marketing-bg relative min-h-screen overflow-hidden text-comply-text-primary antialiased">
      {/* Ambient glow orbs */}
      <div
        className="marketing-orb absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-comply-purple/30"
        aria-hidden
      />
      <div
        className="marketing-orb absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-comply-green/15"
        aria-hidden
      />
      <div
        className="marketing-orb absolute bottom-0 left-1/2 h-[280px] w-[600px] -translate-x-1/2 rounded-full bg-comply-purple/10"
        aria-hidden
      />

      {/* Diagonal shine sweep */}
      <div className="marketing-shine pointer-events-none absolute inset-0 opacity-80" aria-hidden />

      {/* Soft grid */}
      <div className="marketing-grid-overlay pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <header className="marketing-header relative z-10 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-comply-text-secondary md:flex">
            <a href="#frameworks" className="transition-colors hover:text-comply-text-primary">
              Frameworks
            </a>
            <a href="#integrations" className="transition-colors hover:text-comply-text-primary">
              Integrations
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-comply-text-primary">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-comply-text-primary">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <MarketingAuthLinks compact />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero — left-aligned, product-led */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
            <div>
              <SectionLabel>Universal Compliance Engine</SectionLabel>
              <h1 className="mt-4 max-w-xl bg-gradient-to-br from-[#faf9f5] via-[#e8e6e0] to-[#b4b2a9] bg-clip-text text-[2.5rem] font-medium leading-[1.12] tracking-tight text-transparent text-balance sm:text-5xl">
                One platform for every framework your customers ask for
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-comply-text-secondary">
                Vikela maps findings from code, cloud, and identity into SOC 2, HIPAA,
                ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and more—so you run one program,
                not ten spreadsheets.
              </p>
              <div className="mt-8">
                <MarketingAuthLinks />
              </div>
              <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {["Framework mapping packs", "Git, cloud, and identity sources", "Free assessment tier"].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-xs text-comply-text-secondary"
                    >
                      <IconCircleCheck size={14} className="shrink-0 text-comply-green" stroke={2} />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Posture preview panel */}
            <div className="marketing-panel marketing-panel-highlight relative p-5">
              <div className="relative flex items-center justify-between border-b border-white/[0.06] pb-4">
                <span className="text-xs font-medium text-comply-text-secondary">
                  Posture overview
                </span>
                <span className="font-mono text-xs text-comply-text-secondary">Example</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { fw: "SOC 2", score: 78, gaps: 12 },
                  { fw: "HIPAA", score: 64, gaps: 8 },
                  { fw: "ISO 27001", score: 71, gaps: 15 },
                  { fw: "PCI DSS", score: 55, gaps: 22 },
                ].map((row) => (
                  <div key={row.fw}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-mono text-comply-text-primary">{row.fw}</span>
                      <span className="text-comply-text-secondary">{row.score}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/40 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-comply-purple-dark to-comply-purple shadow-[0_0_8px_rgba(83,74,183,0.5)]"
                        style={{ width: `${row.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="relative mt-4 border-t border-white/[0.06] pt-4 text-[11px] leading-relaxed text-comply-muted">
                4 sources connected · 57 open gaps · Last scan 14m ago
              </p>
            </div>
          </div>
        </section>

        {/* Frameworks */}
        <section id="frameworks" className="marketing-section-band relative border-y py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel>Framework coverage</SectionLabel>
                <h2 className="mt-2 text-xl font-medium tracking-tight">
                  Ten frameworks. One control graph.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-comply-text-secondary">
                  Enable the mapping packs you need today; add FedRAMP, CMMC, or ISO 42001
                  control tracking when contracts require them—without re-implementing your program.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw, i) => (
                <FrameworkPill key={fw} name={fw} featured={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Data sources</SectionLabel>
          <h2 className="mt-2 text-xl font-medium tracking-tight">
            Evidence from your whole stack—not just repos
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
            Compliance lives in IAM policies, branch protection, MFA enrollment, and cloud
            configs—not only in application code. Connect the systems auditors actually review.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {INTEGRATION_GROUPS.map((group) => (
              <div key={group.label} className="marketing-panel relative p-5">
                <div className="flex items-center gap-2 text-comply-text-tertiary">
                  {group.label === "Source control" && <IconCode size={16} stroke={1.5} />}
                  {group.label === "Cloud infrastructure" && <IconCloud size={16} stroke={1.5} />}
                  {group.label === "Identity & access" && (
                    <IconShieldCheck size={16} stroke={1.5} />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li
                        key={item.name}
                        className="flex items-center gap-3 text-sm text-comply-text-primary"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-black/30 shadow-inner">
                          <Icon size={16} className="text-comply-text-secondary" stroke={1.5} />
                        </span>
                        {item.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-comply-muted">
            Plus Datadog, Slack, PagerDuty, and additional cloud providers in the integrations catalog.
          </p>
        </section>

        {/* Capabilities */}
        <section className="marketing-section-band border-t py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>Platform</SectionLabel>
            <h2 className="mt-2 text-xl font-medium tracking-tight">
              Built for security and GRC teams
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div key={cap.title} className="marketing-panel relative p-6">
                    <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.1] bg-black/25 text-comply-purple-border shadow-[0_0_16px_-4px_rgba(83,74,183,0.35)]">
                      <Icon size={18} stroke={1.5} />
                    </span>
                    <h3 className="mt-4 text-sm font-medium">{cap.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                      {cap.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="mt-2 text-xl font-medium tracking-tight">From connection to audit-ready</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative">
                  <span className="font-mono text-xs text-comply-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-md border border-comply-purple-border/40 bg-comply-purple/15 text-comply-purple-border shadow-[0_0_20px_-6px_rgba(83,74,183,0.45)]">
                    <Icon size={20} stroke={1.5} />
                  </span>
                  <h3 className="mt-4 text-sm font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/[0.06] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight">Scale with your program</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-comply-text-secondary">
                Start with a single integration. Upgrade when you need continuous scanning and AI-assisted remediation.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {landingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "marketing-panel relative flex flex-col p-6",
                    plan.highlight && "marketing-panel-highlight"
                  )}
                >
                  <h3 className="text-sm font-medium text-comply-text-secondary">{plan.name}</h3>
                  <p className="mt-3 font-mono text-3xl tracking-tight text-comply-text-primary">
                    {plan.price}
                    <span className="text-sm font-sans font-normal text-comply-text-tertiary">
                      {plan.period}
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex gap-2 text-sm text-comply-text-secondary"
                      >
                        <IconCircleCheck
                          size={16}
                          className="mt-0.5 shrink-0 text-comply-green"
                          stroke={2}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={cn(
                      "mt-8 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-opacity",
                      plan.highlight
                        ? "btn-purple-cta max-w-none"
                        : "border border-[var(--border)] text-comply-text-primary hover:border-comply-purple-border"
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-comply-text-secondary">
              {enterpriseFooterCopy}{" "}
              <a href="mailto:hello@vikela.com" className="text-comply-purple-border hover:underline">
                Contact sales
              </a>
            </p>
          </div>
        </section>

        {/* CTA band */}
        <section className="marketing-section-band border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 sm:flex-row">
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                Ready to unify your compliance program?
              </h2>
              <p className="mt-1 text-sm text-comply-text-secondary">
                Connect your first integration and see mapped gaps in minutes.
              </p>
            </div>
            <Link href="/sign-up" className="btn-purple-cta shrink-0 px-6">
              Get started free
              <IconArrowRight size={16} className="ml-1 inline" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="marketing-header relative z-10 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <LogoPill />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-comply-muted">
              Universal Compliance Engine for startups and growth-stage teams.
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
              Documentation
            </Link>
            <Link href="/security" className="hover:text-comply-text-secondary">
              Security
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
