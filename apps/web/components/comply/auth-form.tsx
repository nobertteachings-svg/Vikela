import Link from "next/link";
import { LogoPill } from "./logo-pill";

export function AuthFormCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[280px] rounded-lg border border-[var(--border)] bg-comply-card p-6">
      <div className="flex justify-center">
        <LogoPill />
      </div>
      <h1 className="mt-4 text-center text-sm font-medium text-comply-text-primary">{title}</h1>
      <p className="mt-1 text-center text-xs text-comply-text-secondary">{subtitle}</p>
      <div className="mt-4 flex flex-col items-center gap-3">{children}</div>
      <p className="mt-3 text-center text-xs text-comply-muted">{footer}</p>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex w-full max-w-[240px] items-center gap-2">
      <hr className="flex-1 border-[var(--border-light)]" />
      <span className="text-xs text-comply-muted">or</span>
      <hr className="flex-1 border-[var(--border-light)]" />
    </div>
  );
}

export function AuthEmailField() {
  return (
    <div className="w-full max-w-[240px]">
      <label className="mb-1 block text-left text-xs text-comply-text-secondary">Work email</label>
      <input
        type="email"
        placeholder="you@company.com"
        className="auth-input-field"
      />
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <>
      {text}{" "}
      <Link href={href} className="text-comply-purple hover:underline">
        {linkText}
      </Link>
    </>
  );
}
