import Link from "next/link";
import { notFound } from "next/navigation";
import { helpNav, loadHelpPage } from "@/lib/user-guide";
import { PageHeader } from "@/components/comply/page-header";

export const dynamic = "force-dynamic";

type Props = { params: { slug?: string[] } };

export default function HelpPage({ params }: Props) {
  const slugParts = params.slug ?? [];
  const page = loadHelpPage(slugParts);
  if (!page) notFound();

  const nav = helpNav();

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Help"
        title={page.title}
        description="How to use Shieldoq, connect providers, run scans, collect evidence, and prepare for audit."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          <nav className="space-y-1 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-sm">
            {nav.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-comply-text-secondary hover:bg-white/[0.04] hover:text-comply-text-primary"
                >
                  {item.title}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="ml-2 block rounded-md px-2 py-1 text-xs text-comply-text-tertiary hover:bg-white/[0.04] hover:text-comply-text-primary"
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <p className="mt-3 px-1 text-[11px] text-comply-text-tertiary">
            Tip: start with{" "}
            <Link href="/help/integrations" className="text-comply-purple-border hover:underline">
              Integrations
            </Link>{" "}
            for API keys and connect steps.
          </p>
        </aside>
        <article
          className="help-prose min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-black/20 px-5 py-6 text-sm leading-relaxed text-comply-text-secondary [&_a]:text-comply-purple-border [&_a]:underline-offset-2 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-comply-purple/40 [&_blockquote]:pl-3 [&_blockquote]:text-comply-text-tertiary [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px] [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-comply-text-primary [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-comply-text-primary [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-comply-text-primary [&_li]:my-1 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/40 [&_pre]:p-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/[0.08] [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-white/[0.08] [&_th]:bg-white/[0.04] [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: page.html }}
        />
      </div>
    </div>
  );
}
