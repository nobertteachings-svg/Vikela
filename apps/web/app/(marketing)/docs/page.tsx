import Link from "next/link";
import {
  IconApi,
  IconBrandGithub,
  IconCloud,
  IconPlug,
  IconRocket,
  IconShield,
} from "@tabler/icons-react";
import { DocPage, ProseLi, ProseP, ProseUl } from "@/components/marketing/doc-page";

const QUICK_LINKS = [
  { icon: IconRocket, title: "Quick start", href: "#quickstart" },
  { icon: IconPlug, title: "Integrations", href: "#integrations" },
  { icon: IconShield, title: "Frameworks", href: "#frameworks" },
  { icon: IconApi, title: "API reference", href: "#api" },
] as const;

export default function DocsPage() {
  return (
    <DocPage
      title="Documentation"
      description="Guides for connecting your stack, running scans, mapping gaps to controls, and preparing audit evidence."
      updated="May 22, 2025"
      sidebar={[
        { label: "Start here", href: "#overview" },
        { label: "Quick start", href: "#quickstart" },
        { label: "Integrations", href: "#integrations" },
        { label: "Frameworks", href: "#frameworks" },
        { label: "Gaps & controls", href: "#gaps" },
        { label: "Copilot & policies", href: "#copilot" },
        { label: "API reference", href: "#api" },
      ]}
      sections={[
        {
          id: "overview",
          title: "Start here",
          content: (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 not-prose">
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="marketing-panel flex gap-3 p-4 no-underline hover:-translate-y-0.5"
                  >
                    <Icon size={20} className="shrink-0 text-comply-purple-border" stroke={1.5} />
                    <p className="text-sm font-medium text-comply-text-primary">{item.title}</p>
                  </a>
                );
              })}
            </div>
          ),
        },
        {
          id: "quickstart",
          title: "Quick start",
          content: (
            <>
              <ProseP>Get from zero to a posture score in under ten minutes.</ProseP>
              <ProseUl>
                <ProseLi>
                  <strong>1. Create an account</strong> —{" "}
                  <Link href="/sign-up">Sign up</Link> with email or connect GitHub, GitLab, or
                  Bitbucket.
                </ProseLi>
                <ProseLi>
                  <strong>2. Connect sources</strong> — Select repositories and add cloud or
                  identity providers from Integrations.
                </ProseLi>
                <ProseLi>
                  <strong>3. Enable frameworks</strong> — Turn on SOC 2, HIPAA, ISO 27001, or any
                  combination supported in your plan.
                </ProseLi>
                <ProseLi>
                  <strong>4. Review gaps</strong> — Use the dashboard for severity-ranked findings
                  with remediation steps.
                </ProseLi>
                <ProseLi>
                  <strong>5. Export evidence</strong> — Publish policies and download evidence when
                  frameworks are audit-ready.
                </ProseLi>
              </ProseUl>
            </>
          ),
        },
        {
          id: "integrations",
          title: "Integrations",
          content: (
            <>
              <ProseP>
                Shieldoq reads configuration and security signals from your whole stack—not only
                application repositories.
              </ProseP>
              <div className="not-prose mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-white/[0.08] bg-black/20 p-4">
                  <IconBrandGithub size={18} className="text-comply-text-secondary" />
                  <p className="mt-2 text-xs font-medium text-comply-text-primary">Source control</p>
                  <p className="mt-1 text-xs text-comply-muted">GitHub · GitLab · Bitbucket</p>
                </div>
                <div className="rounded-md border border-white/[0.08] bg-black/20 p-4">
                  <IconCloud size={18} className="text-comply-text-secondary" />
                  <p className="mt-2 text-xs font-medium text-comply-text-primary">Cloud</p>
                  <p className="mt-1 text-xs text-comply-muted">AWS · Azure · GCP</p>
                </div>
                <div className="rounded-md border border-white/[0.08] bg-black/20 p-4">
                  <IconPlug size={18} className="text-comply-text-secondary" />
                  <p className="mt-2 text-xs font-medium text-comply-text-primary">Identity</p>
                  <p className="mt-1 text-xs text-comply-muted">Okta · Azure AD · Workspace</p>
                </div>
              </div>
              <ProseP>
                Trigger scans from the Scans page or rely on scheduled runs. Permission requirements
                are listed per provider in the in-app Integrations catalog.
              </ProseP>
            </>
          ),
        },
        {
          id: "frameworks",
          title: "Frameworks",
          content: (
            <ProseUl>
              <ProseLi>
                <strong>SOC 2 / SOC 1 / SOC 3</strong> — Trust services criteria
              </ProseLi>
              <ProseLi>
                <strong>HIPAA</strong> — Safeguards for protected health information
              </ProseLi>
              <ProseLi>
                <strong>ISO 27001 & ISO 42001</strong> — Security management and AI governance
              </ProseLi>
              <ProseLi>
                <strong>GDPR</strong> — Privacy-oriented control coverage
              </ProseLi>
              <ProseLi>
                <strong>PCI DSS, FedRAMP, CMMC</strong> — Growth and Enterprise tiers
              </ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "gaps",
          title: "Gaps and controls",
          content: (
            <>
              <ProseP>
                Gaps link to control requirements with severity, source, affected resources, and
                remediation guidance. Resolve gaps when fixes ship; evidence flows to the vault.
              </ProseP>
              <ProseP>
                The Controls library shows per-framework implementation status—filter by owner or
                status for auditor working sessions.
              </ProseP>
            </>
          ),
        },
        {
          id: "copilot",
          title: "Copilot and policies",
          content: (
            <>
              <ProseP>
                Copilot answers questions in context of your gaps and integrations—e.g. why a
                control failed and what change fixes it.
              </ProseP>
              <ProseP>
                Policy generator outputs Markdown from your environment. Review, edit, and publish
                before external distribution.
              </ProseP>
            </>
          ),
        },
        {
          id: "api",
          title: "API reference",
          content: (
            <>
              <ProseP>
                REST API base URL (development default):{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-comply-purple-border">
                  http://localhost:3001
                </code>
                . Use an API key from Settings → API Keys.
              </ProseP>
              <ProseUl>
                <ProseLi>
                  <strong>GET /api/v1/dashboard</strong> — Posture and gap summary
                </ProseLi>
                <ProseLi>
                  <strong>GET /api/v1/gaps</strong> — List compliance gaps
                </ProseLi>
                <ProseLi>
                  <strong>GET /api/v1/controls</strong> — Control catalog
                </ProseLi>
                <ProseLi>
                  <strong>GET /api/v1/integrations</strong> — Provider status
                </ProseLi>
                <ProseLi>
                  <strong>POST /api/v1/scans</strong> — Trigger a scan
                </ProseLi>
              </ProseUl>
              <ProseP>
                Send header{" "}
                <code className="rounded bg-black/40 px-1 font-mono text-xs">X-Org-Slug</code> on
                every request. Contact{" "}
                <a href="mailto:support@shieldoq.com">support@shieldoq.com</a> for OpenAPI access.
              </ProseP>
            </>
          ),
        },
      ]}
    />
  );
}
