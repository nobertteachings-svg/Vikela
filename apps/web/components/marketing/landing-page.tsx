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
      "Link GitHub, cloud, and identity in minutes. Vikela pulls the signals auditors actually review.",
  },
  {
    icon: IconShieldCheck,
    title: "See mapped gaps",
    description:
      "Findings land against every framework you enable, with severity and remediation context.",
  },
  {
    icon: IconFileCertificate,
    title: "Close the questionnaire",
    description:
      "Draft answers from live posture, generate policies, and export evidence when you are ready.",
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
  return (
    <div className="marketing-bg relative min-h-screen text-comply-text-primary antialiased">
      <header className="marketing-header sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-comply-text-secondary md:flex">
            <a href="#frameworks" className="transition-colors hover:text-comply-text-primary">
              Frameworks
            </a>
            <a href="#how" className="transition-colors hover:text-comply-text-primary">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-comply-text-primary">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-comply-text-primary">
              FAQ
            </a>
          </nav>
          <MarketingAuthLinks compact />
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pt-28">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-comply-text-primary sm:text-4xl">
            Get audit ready in weeks, not months
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-comply-text-secondary">
            Map code, cloud, and identity into the frameworks buyers ask for. Answer the security
            questionnaire from live controls, not a blank spreadsheet.
          </p>
          <div className="mt-8">
            <MarketingAuthLinks />
          </div>
        </section>

        <section id="frameworks" className="border-y border-[var(--border)] py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-comply-text-primary">
              One program for every framework the deal asks for
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
              Enable SOC 2, ISO, HIPAA, GDPR, PCI, FedRAMP, or CMMC on one control graph.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw) => (
                <span
                  key={fw}
                  className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 font-mono text-xs text-comply-text-secondary"
                >
                  {fw}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-xl font-semibold tracking-tight text-comply-text-primary">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="font-mono text-xs text-comply-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-comply-green">
                    <Icon size={18} stroke={1.5} />
                  </span>
                  <h3 className="mt-4 text-sm font-medium text-comply-text-primary">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-comply-text-secondary">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="integrations" className="border-t border-[var(--border)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-comply-text-primary">
              Evidence from the stack auditors review
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-comply-text-secondary">
              IAM, branch protection, MFA, and cloud config, not only application code.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {INTEGRATION_GROUPS.map((group) => (
                <div
                  key={group.label}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5"
                >
                  <div className="flex items-center gap-2 text-comply-text-tertiary">
                    {group.label === "Source control" ? <IconCode size={16} stroke={1.5} /> : null}
                    {group.label === "Cloud" ? <IconCloud size={16} stroke={1.5} /> : null}
                    {group.label === "Identity" ? <IconShieldCheck size={16} stroke={1.5} /> : null}
                    <span className="text-xs font-medium uppercase tracking-wide">{group.label}</span>
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

        <section id="pricing" className="border-t border-[var(--border)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-comply-text-primary">Pricing</h2>
            <p className="mt-2 max-w-lg text-sm text-comply-text-secondary">
              Published list prices. Upgrade when a deal needs more capacity.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {landingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-5",
                    plan.highlight && "border-comply-green/40 bg-comply-green/[0.06]"
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

        <section id="faq" className="border-t border-[var(--border)] py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-xl font-semibold tracking-tight text-comply-text-primary">FAQ</h2>
            <dl className="mt-10 space-y-2">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] open:border-comply-green/30"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-comply-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.q}
                      <span className="shrink-0 font-mono text-comply-text-tertiary transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <dd className="border-t border-[var(--border)] px-5 pb-4 pt-3 text-sm leading-relaxed text-comply-text-secondary">
                    {item.a}
                  </dd>
                </details>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-comply-text-primary">
              Got the questionnaire? See your gaps today.
            </h2>
            <Link href="/sign-up" className={cn(GREEN_CTA, "px-6")}>
              Start free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
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
