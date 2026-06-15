import { DocPage, ProseLi, ProseP, ProseUl } from "@/components/marketing/doc-page";

const SIDEBAR = [
  { label: "Overview", href: "#overview" },
  { label: "Data we collect", href: "#collection" },
  { label: "How we use data", href: "#use" },
  { label: "Sharing", href: "#sharing" },
  { label: "Retention", href: "#retention" },
  { label: "Your rights", href: "#rights" },
  { label: "Contact", href: "#contact" },
];

export default function PrivacyPage() {
  return (
    <DocPage
      title="Privacy Policy"
      description="How Vikela collects, uses, and protects information when you use our Universal Compliance Engine."
      updated="May 22, 2025"
      sidebar={SIDEBAR}
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <>
              <ProseP>
                Vikela (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a compliance
                automation platform that connects to your source control, cloud, and identity
                systems to map security findings to framework controls.
              </ProseP>
              <ProseP>
                This policy describes how we handle personal data for account holders, invited
                team members, and visitors to our marketing site. It applies to data processed
                through app.vikela.com and related services.
              </ProseP>
            </>
          ),
        },
        {
          id: "collection",
          title: "Data we collect",
          content: (
            <>
              <ProseUl>
                <ProseLi>
                  <strong>Account data:</strong> name, work email, company name, role, and
                  authentication identifiers when you sign up or are invited.
                </ProseLi>
                <ProseLi>
                  <strong>Integration metadata:</strong> repository names, cloud account IDs,
                  configuration snapshots, scan results, and evidence artifacts needed for
                  compliance posture—not your application source code stored long-term unless
                  you enable features that require it.
                </ProseLi>
                <ProseLi>
                  <strong>Usage data:</strong> product interactions, audit logs, IP address,
                  browser type, and timestamps for security and reliability.
                </ProseLi>
                <ProseLi>
                  <strong>Communications:</strong> support requests, questionnaire uploads, and
                  feedback you send us.
                </ProseLi>
              </ProseUl>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use data",
          content: (
            <ProseUl>
              <ProseLi>Provide, operate, and improve the compliance platform</ProseLi>
              <ProseLi>Run automated scans and map findings to SOC 2, HIPAA, ISO, GDPR, and other frameworks</ProseLi>
              <ProseLi>Generate policies, remediation guidance, and audit evidence on your behalf</ProseLi>
              <ProseLi>Authenticate users and enforce workspace access controls</ProseLi>
              <ProseLi>Send product, security, and transactional notices</ProseLi>
              <ProseLi>Comply with legal obligations and respond to lawful requests</ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "sharing",
          title: "Sharing and subprocessors",
          content: (
            <>
              <ProseP>
                We do not sell personal data. We share information only with subprocessors that
                help us run the service (cloud hosting, databases, email, analytics) under
                contractual confidentiality and security obligations, or when required by law.
              </ProseP>
              <ProseP>
                You control which third-party integrations connect to your workspace. Data
                retrieved from GitHub, GitLab, Bitbucket, AWS, Azure, GCP, or identity providers
                stays within your organization&apos;s Vikela tenant unless you export it.
              </ProseP>
            </>
          ),
        },
        {
          id: "retention",
          title: "Retention and security",
          content: (
            <>
              <ProseP>
                We retain account and compliance data for as long as your subscription is active
                and for a limited period afterward so you can export records. You may request
                deletion of your workspace subject to legal and contractual retention requirements.
              </ProseP>
              <ProseP>
                See our <a href="/security">Security</a> page for technical safeguards including
                encryption in transit, access controls, and audit logging.
              </ProseP>
            </>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          content: (
            <ProseUl>
              <ProseLi>Access, correct, or delete personal data associated with your account</ProseLi>
              <ProseLi>Export posture reports, gaps, and evidence from the product</ProseLi>
              <ProseLi>Object to certain processing where applicable under GDPR or similar laws</ProseLi>
              <ProseLi>Withdraw consent for optional communications at any time</ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "contact",
          title: "Contact",
          content: (
            <ProseP>
              Privacy questions or data subject requests:{" "}
              <a href="mailto:privacy@vikela.com">privacy@vikela.com</a>. We aim to respond within
              30 days.
            </ProseP>
          ),
        },
      ]}
    />
  );
}
