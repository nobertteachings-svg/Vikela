import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-comply-secondary p-8 shadow-[var(--shadow-elevated)]">
        <div className="mb-8 flex justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-comply-purple text-lg font-bold text-white shadow-[0_4px_20px_var(--purple-glow)]">
            C
          </span>
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight text-comply-text-primary">{title}</h1>
        <p className="mt-2 text-center text-sm text-comply-text-secondary">{subtitle}</p>
        <div className="mt-8 space-y-4">{children}</div>
        {footer && (
          <div className="mt-8 border-t border-[var(--border)] pt-6 text-center text-sm text-comply-text-secondary">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function GitHubButton({ href = "/api/auth/github/oauth" }: { href?: string }) {
  return (
    <Link href={href} className="comply-btn-success flex w-full items-center justify-center py-2.5">
      Continue with GitHub
    </Link>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-comply-text-tertiary">
      <hr className="flex-1 border-[var(--border)]" />
      <span>or</span>
      <hr className="flex-1 border-[var(--border)]" />
    </div>
  );
}

export function AuthInput({ placeholder, type = "email" }: { placeholder: string; type?: string }) {
  return <input type={type} placeholder={placeholder} className="comply-input" />;
}

export function PurpleButton({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = "comply-btn-primary w-full py-2.5";
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" className={cls}>{children}</button>;
}
