import Link from "next/link";
import { MarketingShell } from "./marketing-shell";

export type DocSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export function DocPage({
  title,
  description,
  updated,
  sections,
  sidebar,
}: {
  title: string;
  description: string;
  updated: string;
  sections: DocSection[];
  sidebar?: { label: string; href: string }[];
}) {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {sidebar && sidebar.length > 0 && (
            <aside className="mb-8 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-comply-text-tertiary">
                On this page
              </p>
              <ul className="mt-3 space-y-2">
                {sidebar.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-sm text-comply-text-secondary transition-colors hover:text-comply-green-border"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href="/"
                className="mt-8 inline-block text-xs text-comply-muted hover:text-comply-text-secondary"
              >
                ← Back to home
              </Link>
            </aside>
          )}

          <article className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-comply-text-tertiary">
              Vikela
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-comply-text-primary sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-comply-text-secondary">
              {description}
            </p>
            <p className="mt-2 text-xs text-comply-muted">Last updated {updated}</p>

            <div className="mt-10 space-y-10">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="marketing-panel relative scroll-mt-24 p-6 lg:p-8"
                >
                  <h2 className="text-lg font-medium text-comply-text-primary">
                    {section.title}
                  </h2>
                  <div className="prose-marketing mt-4">{section.content}</div>
                </section>
              ))}
            </div>

            {!sidebar && (
              <Link
                href="/"
                className="mt-10 inline-block text-sm text-comply-muted hover:text-comply-text-secondary"
              >
                ← Back to home
              </Link>
            )}
          </article>
        </div>
      </div>
    </MarketingShell>
  );
}

export function ProseP({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-comply-text-secondary">{children}</p>;
}

export function ProseUl({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-comply-text-secondary">
      {children}
    </ul>
  );
}

export function ProseLi({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}
