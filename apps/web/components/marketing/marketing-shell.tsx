import Link from "next/link";
import { LogoPill } from "@/components/comply/logo-pill";
import { MarketingAuthLinks } from "@/components/marketing/marketing-auth-links";
import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/docs", label: "Documentation" },
  { href: "/security", label: "Security" },
] as const;

export function MarketingShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="marketing-bg relative min-h-screen overflow-hidden text-comply-text-primary antialiased">
      <div
        className="marketing-orb absolute -left-32 top-10 h-[320px] w-[320px] rounded-full bg-comply-purple/20"
        aria-hidden
      />
      <div
        className="marketing-orb absolute -right-24 top-1/2 h-[280px] w-[280px] rounded-full bg-comply-green/10"
        aria-hidden
      />
      <div className="marketing-shine pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="marketing-grid-overlay pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <header className="marketing-header relative z-10 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <LogoPill />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-comply-text-secondary md:flex">
            <Link href="/#frameworks" className="hover:text-comply-text-primary">
              Frameworks
            </Link>
            <Link href="/docs" className="hover:text-comply-text-primary">
              Docs
            </Link>
            <Link href="/security" className="hover:text-comply-text-primary">
              Security
            </Link>
            <Link href="/#pricing" className="hover:text-comply-text-primary">
              Pricing
            </Link>
          </nav>
          <MarketingAuthLinks compact />
        </div>
      </header>

      <main className={cn("relative z-10", className)}>{children}</main>

      <footer className="marketing-header relative z-10 mt-20 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <LogoPill />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-comply-muted">
              Universal Compliance Engine for startups and growth-stage teams.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-comply-muted">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-comply-text-secondary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
