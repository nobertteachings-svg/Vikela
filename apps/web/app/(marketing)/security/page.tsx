import Link from "next/link";
import {
  IconCloudLock,
  IconKey,
  IconLock,
  IconUserShield,
} from "@tabler/icons-react";
import { DocPage, ProseLi, ProseP, ProseUl } from "@/components/marketing/doc-page";

const SIDEBAR = [
  { label: "Commitment", href: "#commitment" },
  { label: "Architecture", href: "#architecture" },
  { label: "Data protection", href: "#data" },
  { label: "Access controls", href: "#access" },
  { label: "Integrations", href: "#integrations" },
  { label: "Incident response", href: "#incidents" },
  { label: "Compliance", href: "#compliance" },
];

const PILLARS = [
  { icon: IconLock, title: "Encryption", desc: "TLS 1.2+ in transit; encrypted storage at rest" },
  { icon: IconKey, title: "Least privilege", desc: "Role-based access and scoped integration tokens" },
  { icon: IconCloudLock, title: "Tenant isolation", desc: "Logical separation per organization workspace" },
  { icon: IconUserShield, title: "Audit logging", desc: "Administrative and security-relevant events logged" },
];

export default function SecurityPage() {
  return (
    <DocPage
      title="Security"
      description="How Vikela protects your compliance data, credentials, and connected systems."
      updated="May 22, 2025"
      sidebar={SIDEBAR}
      sections={[
        {
          id: "commitment",
          title: "Our commitment",
          content: (
            <>
              <ProseP>
                Vikela is built for teams that handle sensitive security posture data. Security
                is not a checkbox on our roadmap—it is a constraint on every feature we ship.
              </ProseP>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {PILLARS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.title}
                      className="flex gap-3 rounded-md border border-white/[0.08] bg-black/20 p-4"
                    >
                      <Icon size={20} className="shrink-0 text-comply-purple-border" stroke={1.5} />
                      <div>
                        <p className="text-sm font-medium text-comply-text-primary">{p.title}</p>
                        <p className="mt-0.5 text-xs text-comply-text-secondary">{p.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ),
        },
        {
          id: "architecture",
          title: "Platform architecture",
          content: (
            <ProseUl>
              <ProseLi>API and web application hosted on hardened cloud infrastructure with network segmentation</ProseLi>
              <ProseLi>Secrets and integration credentials encrypted with industry-standard algorithms; keys managed via secure vault patterns</ProseLi>
              <ProseLi>Background workers process scans in isolated job queues with retry limits and timeouts</ProseLi>
              <ProseLi>Production access restricted to authorized personnel on a need-to-know basis with MFA</ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "data",
          title: "Data protection",
          content: (
            <>
              <ProseP>
                We collect the minimum data required to assess compliance posture: configuration
                metadata, policy findings, IAM settings, and evidence artifacts—not bulk source
                code archives unless a specific feature you enable requires temporary analysis.
              </ProseP>
              <ProseUl>
                <ProseLi>Customer data is not used to train shared AI models without opt-in</ProseLi>
                <ProseLi>Backups are encrypted and tested on a regular schedule</ProseLi>
                <ProseLi>Data deletion available on workspace termination per our Privacy Policy</ProseLi>
              </ProseUl>
            </>
          ),
        },
        {
          id: "access",
          title: "Access controls",
          content: (
            <ProseUl>
              <ProseLi>
                <strong>Admin, Member, and Auditor</strong> roles with least-privilege defaults
              </ProseLi>
              <ProseLi>SSO and SCIM available on Enterprise plans</ProseLi>
              <ProseLi>Session management and optional IP allowlisting for sensitive deployments</ProseLi>
              <ProseLi>API keys scoped to read or write operations with rotation support</ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "integrations",
          title: "Third-party connections",
          content: (
            <>
              <ProseP>
                Integrations use OAuth, app installations, or short-lived credentials—never
                stored in plain text. Cloud connections such as AWS use cross-account IAM roles
                (AssumeRole) so you control revocation from your side.
              </ProseP>
              <ProseP>
                See <Link href="/docs#integrations">documentation</Link> for required permissions
                per provider and how to scope them narrowly.
              </ProseP>
            </>
          ),
        },
        {
          id: "incidents",
          title: "Incident response",
          content: (
            <>
              <ProseP>
                We maintain an internal incident response plan with defined severity levels,
                on-call rotation, and customer notification procedures for confirmed breaches
                affecting your data.
              </ProseP>
              <ProseP>
                Report a vulnerability:{" "}
                <a href="mailto:security@vikela.com">security@vikela.com</a>. We acknowledge
                reports within two business days and coordinate disclosure responsibly.
              </ProseP>
            </>
          ),
        },
        {
          id: "compliance",
          title: "Our compliance program",
          content: (
            <>
              <ProseP>
                Vikela operates its own security program aligned with SOC 2 control objectives.
                We practice what we sell: continuous monitoring, documented policies, and
                evidence collection through the same engine our customers use.
              </ProseP>
              <ProseP>
                SOC 2 Type II report and security questionnaire responses are available to
                customers on Growth and Enterprise plans via the{" "}
                <Link href="/trust">trust center</Link> or your account team.
              </ProseP>
            </>
          ),
        },
      ]}
    />
  );
}
