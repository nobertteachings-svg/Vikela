/**
 * Production vendor security questionnaire catalog.
 * Used for third-party risk assessments and outbound security questionnaires.
 */

export type CatalogQuestion = {
  category: string;
  question: string;
  /** Starter text for reviewers, always human-reviewed before Approved. */
  suggestedAnswer: string;
};

export const QUESTIONNAIRE_CATEGORIES = [
  "Organization & scope",
  "Security governance",
  "Identity & access",
  "Data protection",
  "Application & infrastructure",
  "Vulnerability & change",
  "Incident & resilience",
  "Privacy & compliance",
  "Subprocessors & contracts",
] as const;

export const VENDOR_SECURITY_CATALOG: CatalogQuestion[] = [
  // Organization & scope
  {
    category: "Organization & scope",
    question: "What legal entity provides the service, and which products/services are in scope for this assessment?",
    suggestedAnswer:
      "State the contracting entity and list products/services that will process or access our data.",
  },
  {
    category: "Organization & scope",
    question: "What categories of our data will you process, store, or access (e.g. PII, credentials, logs, source code)?",
    suggestedAnswer:
      "Enumerate data categories and whether any regulated data (PHI, cardholder, etc.) is involved.",
  },
  {
    category: "Organization & scope",
    question: "Who is the primary security / privacy contact for incidents and questionnaires?",
    suggestedAnswer: "Name, role, email, and escalation path for security notifications.",
  },

  // Security governance
  {
    category: "Security governance",
    question: "Do you maintain a documented information security program (policies, standards, ownership)?",
    suggestedAnswer:
      "Yes. We maintain an information security program with named owners, annual review, and board/executive oversight.",
  },
  {
    category: "Security governance",
    question: "Which independent certifications or attestations do you hold (SOC 2 Type II, ISO 27001, etc.), and what is the report period?",
    suggestedAnswer:
      "List current certifications, report dates, and how customers request reports (e.g. trust center / NDA).",
  },
  {
    category: "Security governance",
    question: "Do employees and contractors complete security awareness training at least annually?",
    suggestedAnswer:
      "Yes. All workforce members complete security awareness training at hire and at least annually, with completion tracked.",
  },

  // Identity & access
  {
    category: "Identity & access",
    question: "Is multi-factor authentication (MFA) required for privileged and remote access to systems that handle customer data?",
    suggestedAnswer:
      "Yes. MFA is required for SSO, VPN/remote access, cloud consoles, and privileged production access.",
  },
  {
    category: "Identity & access",
    question: "How do you enforce least privilege and review access for production systems?",
    suggestedAnswer:
      "Role-based access with least privilege. Privileged access is time-bound where possible. Access reviews run at least quarterly.",
  },
  {
    category: "Identity & access",
    question: "Describe your joiner / mover / leaver process for employee and contractor accounts.",
    suggestedAnswer:
      "Access is provisioned from HR tickets, modified on role change, and revoked on termination within a defined SLA (e.g. same business day).",
  },

  // Data protection
  {
    category: "Data protection",
    question: "Is customer data encrypted at rest? Specify algorithms and covered stores.",
    suggestedAnswer:
      "Yes. Production datastores and object storage use AES-256 (or cloud-equivalent) encryption at rest with managed keys.",
  },
  {
    category: "Data protection",
    question: "Is data encrypted in transit? Which protocols are enforced?",
    suggestedAnswer:
      "Yes. TLS 1.2+ is required for all external connections. Internal service traffic is encrypted or restricted to private networks.",
  },
  {
    category: "Data protection",
    question: "How is multi-tenant customer data logically or physically isolated?",
    suggestedAnswer:
      "Organization-scoped tenancy with row/schema isolation, authorization checks on every request, and separate encryption keys where applicable.",
  },
  {
    category: "Data protection",
    question: "What is your data retention, deletion, and return process when a contract ends?",
    suggestedAnswer:
      "Data is retained per contract/legal needs, then deleted or returned on request within a defined window, with confirmation available on request.",
  },
  {
    category: "Data protection",
    question: "Are backups encrypted, and how often are restore tests performed?",
    suggestedAnswer:
      "Backups are encrypted. Restore/DR tests are performed at least annually (or more often for critical systems) with results documented.",
  },

  // Application & infrastructure
  {
    category: "Application & infrastructure",
    question: "Describe your secure software development lifecycle (code review, dependency scanning, secrets handling).",
    suggestedAnswer:
      "PR reviews required for production code. SCA/SAST in CI. Secrets stored in a vault/secret manager, not in source control.",
  },
  {
    category: "Application & infrastructure",
    question: "Where is production infrastructure hosted, and which regions process customer data?",
    suggestedAnswer:
      "List cloud provider(s) and primary regions. Note any customer-selectable residency options.",
  },
  {
    category: "Application & infrastructure",
    question: "How do you protect production credentials and cloud admin access (e.g. SSO, short-lived credentials, no long-lived keys)?",
    suggestedAnswer:
      "Cloud access via SSO/IAM federation or short-lived credentials. Long-lived root/API keys are avoided or vaulted with rotation.",
  },

  // Vulnerability & change
  {
    category: "Vulnerability & change",
    question: "Do you perform regular vulnerability scanning and third-party penetration testing? What are remediation SLAs by severity?",
    suggestedAnswer:
      "Continuous or frequent vuln scanning plus at least annual third-party pen tests. Critical/High findings remediated under documented SLAs.",
  },
  {
    category: "Vulnerability & change",
    question: "Describe change management for production releases.",
    suggestedAnswer:
      "Changes go through review, automated tests, and controlled deployment. Emergency changes are logged and reviewed after the fact.",
  },

  // Incident & resilience
  {
    category: "Incident & resilience",
    question: "Do you maintain an incident response plan, and what is your customer notification timeline for confirmed breaches affecting our data?",
    suggestedAnswer:
      "Yes. Documented IR plan with severity levels. Customers are notified without undue delay and within contractual/legal timelines (e.g. 72 hours where required).",
  },
  {
    category: "Incident & resilience",
    question: "What are your business continuity / disaster recovery objectives (RTO/RPO) for the in-scope service?",
    suggestedAnswer:
      "State RTO/RPO targets for the production service and summarize the last DR exercise date.",
  },
  {
    category: "Incident & resilience",
    question: "How do you communicate service incidents to customers (status page, email, etc.)?",
    suggestedAnswer:
      "Status page and/or email/SMS to subscribed contacts; major incidents include post-incident summaries on request.",
  },

  // Privacy & compliance
  {
    category: "Privacy & compliance",
    question: "Will you sign a Data Processing Agreement (DPA) / BAA (if applicable) and provide a current subprocessor list?",
    suggestedAnswer:
      "Yes. DPA/BAA available as applicable. Current subprocessors are listed and customers are notified of material changes per contract.",
  },
  {
    category: "Privacy & compliance",
    question: "How do you support data subject / privacy requests that involve data you process on our behalf?",
    suggestedAnswer:
      "We support access, deletion, and correction requests via documented process within contractual SLAs, coordinating with the controller.",
  },
  {
    category: "Privacy & compliance",
    question: "Which compliance frameworks do you map to for this service (SOC 2, ISO 27001, GDPR, HIPAA, PCI, etc.)?",
    suggestedAnswer:
      "List frameworks in scope for the product and how evidence/reports are shared with customers.",
  },

  // Subprocessors & contracts
  {
    category: "Subprocessors & contracts",
    question: "List material subprocessors that will process our data and their primary purpose.",
    suggestedAnswer:
      "Provide current material subprocessors (e.g. cloud, auth, email, payments) with purpose and data categories.",
  },
  {
    category: "Subprocessors & contracts",
    question: "Do customers have a contractual right to audit or to receive equivalent evidence (SOC reports, questionnaires)?",
    suggestedAnswer:
      "Yes, per MSA/DPA: SOC reports, security questionnaires, and reasonable audit rights or equivalent evidence packages.",
  },
  {
    category: "Subprocessors & contracts",
    question: "Do you maintain cyber liability insurance appropriate to the services provided?",
    suggestedAnswer:
      "Yes. Cyber liability coverage is maintained; certificates available on request under NDA where required.",
  },
];

export function catalogCreateRows() {
  return VENDOR_SECURITY_CATALOG.map((d, idx) => ({
    question: d.question,
    suggestedAnswer: d.suggestedAnswer,
    category: d.category,
    status: "PENDING" as const,
    sortOrder: idx,
  }));
}
