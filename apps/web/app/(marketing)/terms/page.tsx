import { DocPage, ProseLi, ProseP, ProseUl } from "@/components/marketing/doc-page";

const SIDEBAR = [
  { label: "Agreement", href: "#agreement" },
  { label: "Service", href: "#service" },
  { label: "Your responsibilities", href: "#responsibilities" },
  { label: "Fees", href: "#fees" },
  { label: "IP & data", href: "#ip" },
  { label: "Liability", href: "#liability" },
  { label: "Termination", href: "#termination" },
];

export default function TermsPage() {
  return (
    <DocPage
      title="Terms of Service"
      description="Terms governing access to Shieldoq's compliance platform and related services."
      updated="May 22, 2025"
      sidebar={SIDEBAR}
      sections={[
        {
          id: "agreement",
          title: "Agreement",
          content: (
            <ProseP>
              By creating an account, connecting an integration, or using Shieldoq, you agree to
              these Terms and our <a href="/privacy">Privacy Policy</a>. If you use the service
              on behalf of a company, you represent that you have authority to bind that company.
            </ProseP>
          ),
        },
        {
          id: "service",
          title: "The service",
          content: (
            <>
              <ProseP>
                Shieldoq provides a Universal Compliance Engine: continuous mapping of security
                findings from code, cloud, and identity sources to controls across frameworks
                including SOC 2, HIPAA, ISO 27001, ISO 42001, GDPR, PCI DSS, FedRAMP, CMMC, and
                others supported in the product.
              </ProseP>
              <ProseP>
                We may update features, frameworks, and integrations over time. Beta or preview
                features are provided as-is and may change without notice.
              </ProseP>
            </>
          ),
        },
        {
          id: "responsibilities",
          title: "Your responsibilities",
          content: (
            <ProseUl>
              <ProseLi>Maintain accurate account information and protect login credentials</ProseLi>
              <ProseLi>Ensure you have permission to connect third-party systems to Shieldoq</ProseLi>
              <ProseLi>Review AI-generated policies, gap remediations, and questionnaire answers before relying on them for audits</ProseLi>
              <ProseLi>Use the service in compliance with applicable laws and integration provider terms</ProseLi>
              <ProseLi>Not attempt to probe, disrupt, or reverse engineer the platform</ProseLi>
            </ProseUl>
          ),
        },
        {
          id: "fees",
          title: "Fees and plans",
          content: (
            <>
              <ProseP>
                Paid plans are billed according to the pricing shown at signup or in your order
                form. Fees are non-refundable except where required by law or explicitly stated
                in writing. We may change pricing with reasonable notice to existing customers.
              </ProseP>
              <ProseP>
                The free assessment tier includes limited integrations and features as described
                on our <a href="/#pricing">pricing page</a>.
              </ProseP>
            </>
          ),
        },
        {
          id: "ip",
          title: "Intellectual property and data",
          content: (
            <>
              <ProseP>
                Shieldoq owns the platform, software, and documentation. You retain ownership of
                your data. You grant us a limited license to process your data solely to provide
                and improve the service.
              </ProseP>
              <ProseP>
                Aggregated, de-identified analytics may be used to improve product quality. We
                will not use your identifiable compliance data to train public models without
                your consent.
              </ProseP>
            </>
          ),
        },
        {
          id: "liability",
          title: "Disclaimer and liability",
          content: (
            <>
              <ProseP>
                Shieldoq helps identify gaps and organize evidence; it does not guarantee
                certification, audit outcomes, or regulatory approval. The service is provided
                &quot;as is&quot; to the maximum extent permitted by law.
              </ProseP>
              <ProseP>
                Our total liability for any claim arising from these Terms is limited to fees
                paid by you in the twelve months before the claim, except for fraud or liability
                that cannot be limited by law.
              </ProseP>
            </>
          ),
        },
        {
          id: "termination",
          title: "Termination",
          content: (
            <>
              <ProseP>
                You may cancel at any time through account settings or by contacting support.
                We may suspend or terminate access for material breach, non-payment, or security
                risk after notice where practicable.
              </ProseP>
              <ProseP>
                Upon termination you may export data for a limited grace period; thereafter we
                delete or anonymize data per our retention schedule.
              </ProseP>
              <ProseP>
                Questions: <a href="mailto:legal@shieldoq.com">legal@shieldoq.com</a>
              </ProseP>
            </>
          ),
        },
      ]}
    />
  );
}
