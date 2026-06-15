import Link from "next/link";
import {
  IconArrowLeft,
  IconBrandBitbucket,
  IconBrandGithub,
  IconBrandGitlab,
  IconCircleCheck,
  IconUsers,
  IconStack2,
  IconPlugConnected,
} from "@tabler/icons-react";
import { LogoPill } from "@/components/comply/logo-pill";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  "SOC 2",
  "SOC 1",
  "HIPAA",
  "ISO 27001",
  "ISO 42001",
  "GDPR",
  "PCI DSS",
  "FedRAMP",
  "CMMC",
] as const;

const GIT_PROVIDERS = [
  {
    id: "github",
    name: "GitHub",
    icon: IconBrandGithub,
    className:
      "border-[var(--green-dark)] bg-[var(--green)] text-[var(--green-light)] hover:brightness-110",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: IconBrandGitlab,
    className:
      "border-orange-900/50 bg-orange-600/90 text-white hover:brightness-110",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: IconBrandBitbucket,
    className:
      "border-blue-900/50 bg-blue-700/90 text-white hover:brightness-110",
  },
] as const;

const ONBOARDING_STEPS = [
  { icon: IconPlugConnected, label: "Connect", desc: "Repos & cloud" },
  { icon: IconStack2, label: "Frameworks", desc: "Pick your standards" },
  { icon: IconUsers, label: "Team", desc: "Invite collaborators" },
] as const;

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const COPY = {
  signup: {
    formTitle: "Create your account",
    formSubtitle:
      "Choose how you want to sign up. You can add cloud and identity sources right after.",
    cta: "Create account",
    ctaHref: hasClerk ? "/sign-up" : "/onboarding/connect-repos",
    footerText: "Already have an account?",
    footerLink: "Sign in",
    footerHref: hasClerk ? "/sign-in" : "/login",
    asideHeadline: "Universal Compliance Engine",
    asideHeadline2: "Get audit-ready across every framework",
    asideBody:
      "Start with one integration and one framework. Expand to HIPAA, PCI DSS, FedRAMP, or CMMC when contracts require it—all from the same control graph.",
  },
  login: {
    formTitle: "Welcome back",
    formSubtitle: "Sign in to your workspace and pick up remediation where you left off.",
    cta: hasClerk ? "Sign in with email" : "Open dashboard",
    ctaHref: hasClerk ? "/sign-in" : "/dashboard",
    footerText: "New here?",
    footerLink: "Create an account",
    footerHref: hasClerk ? "/sign-up" : "/signup",
    asideHeadline: "Universal Compliance Engine",
    asideHeadline2: "Your posture dashboard is waiting",
    asideBody:
      "SOC 2, HIPAA, ISO 27001, GDPR, PCI DSS, FedRAMP, CMMC, and more—tracked from the same control graph.",
  },
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-comply-purple-border">
      {children}
    </p>
  );
}

function SignupAside() {
  return (
    <>
      <div className="marketing-panel relative mt-8 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
          What happens next
        </p>
        <ol className="mt-3 flex gap-3">
          {ONBOARDING_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="flex flex-1 flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-comply-purple-border/30 bg-comply-purple/10 text-comply-purple-border">
                  <Icon size={16} stroke={1.5} />
                </span>
                <span className="mt-2 font-mono text-[10px] text-comply-text-tertiary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-xs font-medium text-comply-text-primary">
                  {step.label}
                </span>
                <span className="text-[10px] text-comply-muted">{step.desc}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <ul className="mt-8 space-y-3">
        {[
          "GitHub, GitLab, or Bitbucket—not GitHub only",
          "AWS, Azure, GCP, and identity providers after signup",
          "All frameworks included on every plan",
        ].map((line) => (
          <li key={line} className="flex gap-2.5 text-xs leading-relaxed text-comply-text-secondary">
            <IconCircleCheck size={15} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
            {line}
          </li>
        ))}
      </ul>
    </>
  );
}

function LoginAside() {
  return (
    <ul className="mt-8 space-y-3">
      {[
        "GitHub, GitLab, or Bitbucket for code evidence",
        "AWS, Azure, and GCP for infrastructure controls",
        "Okta, Azure AD, and Workspace for identity",
      ].map((line) => (
        <li key={line} className="flex gap-2.5 text-xs leading-relaxed text-comply-text-secondary">
          <IconCircleCheck size={15} className="mt-0.5 shrink-0 text-comply-green" stroke={2} />
          {line}
        </li>
      ))}
    </ul>
  );
}

export function AuthScreen({ mode }: { mode: keyof typeof COPY }) {
  const copy = COPY[mode];
  const isSignup = mode === "signup";
  const emailInputId = isSignup ? "signup-email" : "login-email";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="marketing-orb absolute -left-32 top-16 h-[380px] w-[380px] rounded-full bg-comply-purple/25"
        aria-hidden
      />
      <div
        className="marketing-orb absolute -right-20 bottom-20 h-[320px] w-[320px] rounded-full bg-comply-green/10"
        aria-hidden
      />
      <div className="marketing-shine pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="marketing-grid-overlay pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="group transition-transform group-hover:scale-[1.02]">
            <LogoPill />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-comply-muted transition-colors hover:text-comply-text-secondary"
          >
            <IconArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-12 lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
          <div className="mb-12 max-w-md lg:mb-0 lg:flex-1">
            <SectionLabel>{copy.asideHeadline}</SectionLabel>
            <h1 className="mt-4 bg-gradient-to-br from-[#faf9f5] via-[#d8d6ce] to-[#888780] bg-clip-text text-3xl font-medium leading-tight tracking-tight text-transparent sm:text-4xl">
              {copy.asideHeadline2}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-comply-text-secondary">
              {copy.asideBody}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {FRAMEWORKS.map((fw, i) => (
                <span
                  key={fw}
                  className={cn(
                    "rounded-sm border px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm",
                    i === 0
                      ? "border-comply-purple-border/50 bg-comply-purple/15 text-comply-purple-light"
                      : "border-white/[0.08] bg-white/[0.04] text-comply-text-secondary"
                  )}
                >
                  {fw}
                </span>
              ))}
            </div>

            {isSignup ? <SignupAside /> : <LoginAside />}
          </div>

          <div className="w-full max-w-[400px] shrink-0 lg:max-w-[440px]">
            <div className="marketing-panel marketing-panel-highlight relative p-8">
              {isSignup && (
                <span
                  className="relative mb-4 inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-comply-green"
                  style={{
                    borderColor: "color-mix(in srgb, var(--green-border) 40%, transparent)",
                    background: "color-mix(in srgb, var(--green) 12%, transparent)",
                  }}
                >
                  Free assessment tier
                </span>
              )}

              <h2 className="relative text-xl font-medium tracking-tight text-comply-text-primary">
                {copy.formTitle}
              </h2>
              <p className="relative mt-1.5 text-sm leading-relaxed text-comply-text-secondary">
                {copy.formSubtitle}
              </p>

              <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                Sign up with source control — create account first
              </p>
              <div className="relative mt-3 grid grid-cols-3 gap-2">
                {GIT_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <Link
                      key={provider.id}
                      href={hasClerk ? "/sign-up" : "/onboarding/connect-repos"}
                      title={
                        hasClerk
                          ? "Create an account first — then connect from Integrations"
                          : "Continue onboarding in local dev mode"
                      }
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-md border py-3.5 text-[11px] font-medium transition-all duration-200",
                        provider.className
                      )}
                    >
                      <Icon size={20} stroke={1.25} />
                      {provider.name}
                    </Link>
                  );
                })}
              </div>

              <div className="relative mt-6 flex items-center gap-3">
                <hr className="flex-1 border-white/[0.08]" />
                <span className="text-[11px] text-comply-muted">or register with email</span>
                <hr className="flex-1 border-white/[0.08]" />
              </div>

              <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
                {isSignup && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="signup-name"
                      className="mb-1.5 block text-xs text-comply-text-secondary"
                    >
                      Full name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      placeholder="Alex Morgan"
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-black/35 px-3 text-sm text-comply-text-primary shadow-inner placeholder:text-comply-muted focus:border-comply-purple-border/60 focus:outline-none focus:ring-2 focus:ring-comply-purple/25"
                    />
                  </div>
                )}
                <div className={isSignup ? "sm:col-span-2" : ""}>
                  <label
                    htmlFor={emailInputId}
                    className="mb-1.5 block text-xs text-comply-text-secondary"
                  >
                    Work email
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    placeholder="you@company.com"
                    className="h-10 w-full rounded-md border border-white/[0.1] bg-black/35 px-3 text-sm text-comply-text-primary shadow-inner placeholder:text-comply-muted focus:border-comply-purple-border/60 focus:outline-none focus:ring-2 focus:ring-comply-purple/25"
                  />
                </div>
                {isSignup && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="signup-company"
                      className="mb-1.5 block text-xs text-comply-text-secondary"
                    >
                      Company
                    </label>
                    <input
                      id="signup-company"
                      type="text"
                      placeholder="Acme Corp"
                      className="h-10 w-full rounded-md border border-white/[0.1] bg-black/35 px-3 text-sm text-comply-text-primary shadow-inner placeholder:text-comply-muted focus:border-comply-purple-border/60 focus:outline-none focus:ring-2 focus:ring-comply-purple/25"
                    />
                  </div>
                )}
              </div>

              <Link
                href={copy.ctaHref}
                className="btn-purple-cta relative mt-5 flex h-11 w-full max-w-none items-center justify-center text-sm font-medium"
              >
                {copy.cta}
              </Link>

              <p className="relative mt-6 text-center text-xs leading-relaxed text-comply-muted">
                {copy.footerText}{" "}
                <Link
                  href={copy.footerHref}
                  className="font-medium text-comply-purple-border hover:text-comply-purple-light hover:underline"
                >
                  {copy.footerLink}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
