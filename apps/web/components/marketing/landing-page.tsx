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
  },
  {
    icon: IconShieldCheck,
    title: "See mapped gaps",
    description:
      "Findings map to SOC 2, ISO 27001, HIPAA, and the rest, with context so you know what to fix first.",
  },
  {
    icon: IconFileCertificate,
    title: "Close the questionnaire",
    description:
      "Draft answers from live posture, generate policies, and export evidence when you are ready for review.",
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

function FrameworkPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] font-medium tracking-tight text-comply-text-secondary">
      {name}
    </span>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-comply-text-primary antialiased">
      <header className="relative z-10 border-b border-white/[0.08] bg-[var(--bg-app)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-comply-text-secondary md:flex">
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
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 sm:pt-28">
          <p className="text-sm font-medium text-comply-purple-border">Vikela</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-comply-text-primary sm:text-4xl">
            Get audit ready in weeks, not months
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-comply-text-secondary">
            Map code, cloud, and identity into the frameworks buyers ask for. Answer the security
            questionnaire from live controls, not a blank spreadsheet.
          </p>
          <div className="mt-8">
            <MarketingAuthLinks />
          </div>
          <p className="mt-6 text-sm text-comply-text-tertiary">
            Free to start. Published prices. No sales call required.
          </p>
        </section>

        <section
          id="frameworks"
          className="border-y border-white/[0.08] bg-black/20 py-10"
        >
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-sm font-medium text-comply-text-primary">
              Frameworks on one control graph
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-comply-text-secondary">
              SOC 2, ISO, HIPAA, GDPR, PCI, FedRAMP, CMMC, and more. Enable what the deal asks for
              without rebuilding the program for each RFP.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw) => (
                <FrameworkPill key={fw} name={fw} />
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-comply-text-primary">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title}>
                  <span className="font-mono text-xs text-comply-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-3 flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.1] bg-black/25 text-comply-purple-border">
                    <Icon size={18} stroke={1.5} />
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

        <section id="integrations" className="border-t border-white/[0.08] py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-comply-text-primary">
              Evidence from the stack auditors review
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-comply-text-secondary">
              IAM, branch protection, MFA, and cloud config, not only application code.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {INTEGRATION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 text-comply-text-tertiary">
                    {group.label === "Source control" && <IconCode size={16} stroke={1.5} />}
                    {group.label === "Cloud" && <IconCloud size={16} stroke={1.5} />}
                    {group.label === "Identity" && <IconShieldCheck size={16} stroke={1.5} />}
                    <span className="text-xs font-medium uppercase tracking-wide">
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
                          <Icon size={16} className="text-comply-text-secondary" stroke={1.5} />
                          {item.name}
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
            <h2 className="text-2xl font-semibold tracking-tight text-comply-text-primary">
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
                    "flex flex-col rounded-md border border-white/[0.1] bg-black/20 p-5",
                    plan.highlight && "border-comply-purple-border/50 bg-comply-purple/10"
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
                  <Link
                    href="/sign-up"
                    className={cn(
                      "mt-6 inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium",
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
              Cancel anytime. Annual billing saves about 17%.
            </p>
            <p className="mt-3 text-center text-sm text-comply-text-secondary">
              {enterpriseFooterCopy}{" "}
              <a href="mailto:hello@vikela.com" className="text-comply-purple-border hover:underline">
                Contact sales
              </a>
            </p>
          </div>
        </section>

        <section id="faq" className="border-t border-white/[0.08] py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-comply-text-primary">FAQ</h2>
            <dl className="mt-10 space-y-2">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-md border border-white/[0.1] bg-black/15 open:border-comply-purple-border/30"
                >
                  <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-comply-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="shrink-0 font-mono text-comply-text-tertiary transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <dd className="border-t border-white/[0.06] px-4 pb-4 pt-3 text-sm leading-relaxed text-comply-text-secondary">
                    {item.a}
                  </dd>
                </details>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-white/[0.08]">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-14 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-comply-text-primary">
                Got the questionnaire? See your gaps today.
              </h2>
              <p className="mt-1 text-sm text-comply-text-secondary">
                Free to start. No sales call.
              </p>
            </div>
            <Link href="/sign-up" className="btn-purple-cta px-6">
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
