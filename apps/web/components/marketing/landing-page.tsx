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
  IconCurrencyDollar,
  IconFileCertificate,
  IconLayoutDashboard,
  IconRocket,
  IconRobot,
  IconShieldCheck,
  IconStack2,
  IconClock,
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
      "Findings from repos, cloud accounts, and identity providers map to the exact control—across every framework you enable.",
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

const WHY_VIKELA = [
  {
    icon: IconRocket,
    title: "Self-serve from day one",
    description:
      "Sign up, connect a source, and see posture—no demo call required to start. Enterprise sales stays optional for Enterprise plans.",
  },
  {
    icon: IconCurrencyDollar,
    title: "Prices you can see before you buy",
    description:
      "Published list prices from Free through Growth. Upgrade when a deal needs more capacity—not after a procurement loop.",
  },
  {
    icon: IconShieldCheck,
    title: "Built for the questionnaire moment",
    description:
      "Most teams start when a customer sends a security review. Vikela maps gaps and drafts answers from your live stack.",
  },
  {
    icon: IconStack2,
    title: "Code, cloud, and identity—together",
    description:
      "Auditors don’t only look at repos. Branch protection, IAM, MFA, and cloud config feed one control graph.",
  },
] as const;

const FIRST_HOUR = [
  {
    t: "0–10 min",
    title: "Connect your first source",
    description: "GitHub, cloud, or identity. Most teams finish the first connection in under ten minutes.",
  },
  {
    t: "Minutes later",
    title: "See mapped gaps",
    description:
      "Findings land against SOC 2, ISO 27001, and HIPAA controls—so you know what blocks the deal.",
  },
  {
    t: "Same day",
    title: "Answer the questionnaire",
    description:
      "Use posture-backed drafts instead of a blank spreadsheet. Escalate to Growth when you need Copilot and exports.",
  },
] as const;

const STEPS = [
  {
    icon: IconCloud,
    title: "Connect your stack",
    description:
      "Link GitHub, GitLab, or Bitbucket alongside AWS, Azure, GCP, and identity providers. Most teams connect their first integration in under 10 minutes.",
  },
  {
    icon: IconShieldCheck,
    title: "See mapped gaps",
    description:
      "Every finding ties to SOC 2, ISO 27001, HIPAA, and the rest—with auditor-ready context so you know what to fix first.",
  },
  {
    icon: IconFileCertificate,
    title: "Close the deal & the audit",
    description:
      "Answer questionnaires, generate policies, and export evidence packages when frameworks are ready for review.",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "Is my data safe with Vikela?",
    a: "We treat your stack credentials and evidence as sensitive by default: provider tokens are encrypted at rest (AES-256-GCM), AWS connections use AssumeRole (no long-lived keys), and access is scoped to your workspace. See our Security page for current controls and practices.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect their first integration in under 10 minutes and start seeing mapped gaps shortly after. Getting fully audit-ready still depends on your starting posture—but you won’t spend months building a spreadsheet program first.",
  },
  {
    q: "What happens if I go over my check or seat limit?",
    a: "We enforce plan limits in-product with a clear upgrade prompt—no surprise overage invoices. Upgrade when a deal needs more capacity, or stay on your current tier and wait for the next billing cycle where limits reset (checks) or free a seat.",
  },
  {
    q: "Can I switch or add frameworks later?",
    a: "Yes. Enable the mapping packs you need today and add FedRAMP, CMMC, or ISO 42001 when contracts require them—without re-implementing your program.",
  },
  {
    q: "Do I need a compliance person on my team?",
    a: "No dedicated GRC hire required to get value. Vikela is self-serve: founders and eng leads typically run it. You’ll still need an external auditor for formal SOC 2 / ISO attestation when you’re ready.",
  },
  {
    q: "Is Vikela a replacement for an auditor?",
    a: "No. Vikela gets you audit-ready—gaps mapped, evidence collected, questionnaires answered. A licensed CPA / audit firm still issues the report. We make that engagement faster and less painful.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Cancel anytime from billing. After cancellation you can export evidence you’ve collected; we retain data only as needed to operate the service and meet legal obligations, then delete workspace data per our retention policy in Terms / Privacy.",
  },
] as const;

const HERO_PROOF = [
  "Built for seed–Series A & scale-up teams",
  "Self-serve — no sales call",
  "Transparent pricing, free to start",
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

      <div className="marketing-shine pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <div className="marketing-grid-overlay pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <header className="marketing-header relative z-10 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-comply-text-secondary lg:flex">
            <a href="#why" className="transition-colors hover:text-comply-text-primary">
              Why Vikela
            </a>
            <a href="#frameworks" className="transition-colors hover:text-comply-text-primary">
              Frameworks
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-comply-text-primary">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-comply-text-primary">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-comply-text-primary">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <MarketingAuthLinks compact />
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
            <div>
              <SectionLabel>SOC 2 for startups &amp; scale-ups</SectionLabel>
              <h1 className="mt-4 max-w-xl bg-gradient-to-br from-[#faf9f5] via-[#e8e6e0] to-[#b4b2a9] bg-clip-text text-[2.5rem] font-medium leading-[1.12] tracking-tight text-transparent text-balance sm:text-5xl">
                Get audit-ready in weeks, not months
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-comply-text-secondary">
                Vikela is compliance automation built for startup and scale-up teams: connect your
                stack, see your SOC 2, ISO 27001, and HIPAA gaps in minutes, and close the enterprise
                deal stuck on a security questionnaire.
              </p>
              <div className="mt-8">
                <MarketingAuthLinks />
              </div>
              <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {HERO_PROOF.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-comply-text-secondary"
                  >
                    <IconCircleCheck size={14} className="shrink-0 text-comply-green" stroke={2} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="marketing-panel marketing-panel-highlight relative p-5">
              <div className="relative flex items-center justify-between border-b border-white/[0.06] pb-4">
                <span className="text-xs font-medium text-comply-text-secondary">
                  Posture overview
                </span>
                <span className="font-mono text-xs text-comply-text-secondary">Example</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { fw: "SOC 2", score: 78 },
                  { fw: "HIPAA", score: 64 },
                  { fw: "ISO 27001", score: 71 },
                  { fw: "PCI DSS", score: 55 },
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
                4 sources connected · 57 open gaps · Last check 14m ago
              </p>
            </div>
          </div>
        </section>

        {/* Buyer trigger */}
        <section className="border-y border-white/[0.06] bg-black/20">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
              <span className="font-medium text-comply-text-primary">
                Most teams start Vikela the moment a customer sends a security questionnaire
              </span>
              — not before. Mapped gaps after you connect your first integration, not after months of
              spreadsheet prep.
            </p>
            <div className="flex shrink-0 flex-wrap gap-4">
              <Link
                href="/sign-up"
                className="text-sm font-medium text-comply-purple-border transition-colors hover:text-comply-purple-light"
              >
                See your gaps →
              </Link>
              <Link
                href="/sign-up"
                className="text-sm text-comply-text-secondary transition-colors hover:text-comply-text-primary"
              >
                Answer your first questionnaire
              </Link>
            </div>
          </div>
        </section>

        {/* ICP social proof — honest, no fake logos */}
        <section className="border-b border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-center text-sm text-comply-text-secondary">
              Built for{" "}
              <span className="text-comply-text-primary">seed–Series A and scale-up teams</span>{" "}
              closing enterprise deals — founders and eng leads who need SOC 2 without a GRC
              department.
            </p>
            <div className="mx-auto mt-6 max-w-2xl border-l-2 border-comply-purple-border/50 pl-5 text-left">
              <p className="text-sm leading-relaxed text-comply-text-secondary">
                The job: answer the questionnaire, know which controls are actually failing in{" "}
                <span className="text-comply-text-primary">your</span> GitHub and AWS — not sit
                through another sales demo or fill a blank spreadsheet.
              </p>
              <p className="mt-3 text-xs text-comply-muted">
                Real customer stories will land here as design partners ship audits with Vikela.
              </p>
            </div>
          </div>
        </section>

        <section id="why" className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Why Vikela</SectionLabel>
          <h2 className="mt-2 max-w-xl text-xl font-medium tracking-tight">
            What you get that the spreadsheet — and the sales-gated tools — won’t give you
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
            Positive claims about how we work. No competitor table required.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {WHY_VIKELA.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="marketing-panel relative p-6">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.1] bg-black/25 text-comply-purple-border">
                    <Icon size={18} stroke={1.5} />
                  </span>
                  <h3 className="mt-4 text-sm font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="marketing-section-band border-y py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-6">
              <div>
                <SectionLabel>Time to value</SectionLabel>
                <h2 className="mt-2 text-xl font-medium tracking-tight">
                  Your first hour with Vikela
                </h2>
                <p className="mt-2 max-w-xl text-sm text-comply-text-secondary">
                  Concrete milestones — not a vague “get started” promise.
                </p>
              </div>
              <IconClock
                size={28}
                className="hidden shrink-0 text-comply-purple-border/60 sm:block"
                stroke={1.25}
              />
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {FIRST_HOUR.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="font-mono text-xs text-comply-purple-border">{step.t}</span>
                  <span className="mt-2 block font-mono text-[10px] text-comply-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-sm font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-10">
              <Link href="/sign-up" className="btn-purple-cta h-10 px-5 text-sm">
                Start free — see gaps today
                <IconArrowRight size={16} className="ml-1.5 inline" />
              </Link>
            </div>
          </div>
        </section>

        <section id="frameworks" className="relative py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel>Framework coverage</SectionLabel>
                <h2 className="mt-2 text-xl font-medium tracking-tight">
                  Start with SOC 2. Add frameworks when deals require them.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-comply-text-secondary">
                  One control graph across the packs you enable—no re-implementing your program when
                  the next RFP asks for ISO, HIPAA, or FedRAMP.
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

        <section className="marketing-section-band border-t py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>Platform</SectionLabel>
            <h2 className="mt-2 text-xl font-medium tracking-tight">
              Built for founders and eng leads who still need to ship
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

        <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Workflow</SectionLabel>
          <h2 className="mt-2 text-xl font-medium tracking-tight">
            From questionnaire to audit-ready
          </h2>
          <p className="mt-2 max-w-xl text-sm text-comply-text-secondary">
            Three steps. No implementation partner required.
          </p>
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

        <section id="pricing" className="border-t border-white/[0.06] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight">
                Transparent pricing. Free to start.
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-comply-text-secondary">
                Self-serve plans with published list prices. Upgrade when a deal needs more
                capacity—not after a sales call.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="mt-8 text-center text-xs text-comply-muted">
              Cancel anytime · No seat surprises · Upgrade when a deal needs it · Annual saves ~17%
            </p>
            <p className="mt-4 text-center text-sm text-comply-text-secondary">
              {enterpriseFooterCopy}{" "}
              <a href="mailto:hello@vikela.com" className="text-comply-purple-border hover:underline">
                Contact sales
              </a>
            </p>
          </div>
        </section>

        <section id="faq" className="marketing-section-band border-t py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center">
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-tight">
                Questions founders actually ask
              </h2>
            </div>
            <dl className="mt-12 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="marketing-panel group open:border-comply-purple-border/30"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-comply-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="shrink-0 font-mono text-comply-text-tertiary transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <dd className="border-t border-white/[0.06] px-5 pb-4 pt-3 text-sm leading-relaxed text-comply-text-secondary">
                    {item.a}
                  </dd>
                </details>
              ))}
            </dl>
            <p className="mt-8 text-center text-xs text-comply-muted">
              More detail on{" "}
              <Link href="/security" className="text-comply-purple-border hover:underline">
                Security
              </Link>{" "}
              and{" "}
              <Link href="/docs" className="text-comply-purple-border hover:underline">
                Docs
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 sm:flex-row">
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                Got the questionnaire? See your gaps today.
              </h2>
              <p className="mt-1 text-sm text-comply-text-secondary">
                Free to start. Self-serve. Transparent pricing — no sales call.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link href="/sign-up" className="btn-purple-cta px-6">
                Start free
                <IconArrowRight size={16} className="ml-1 inline" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex h-8 items-center px-3 text-sm text-comply-text-secondary hover:text-comply-text-primary"
              >
                View pricing
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="marketing-header relative z-10 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <LogoPill />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-comply-muted">
              Compliance automation for startup and scale-up teams—self-serve, transparent pricing.
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
            <a href="#pricing" className="hover:text-comply-text-secondary">
              Pricing
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
