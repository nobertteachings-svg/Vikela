/** Canonical compliance framework catalog — marketing, onboarding, and seed data. */
export type FrameworkCatalogEntry = {
  slug: string;
  name: string;
  description: string;
  version: string;
  /** Shown on onboarding cards */
  tagline: string;
  recommended?: boolean;
  isNew?: boolean;
};

export const COMPLIANCE_FRAMEWORKS: FrameworkCatalogEntry[] = [
  {
    slug: "soc2",
    name: "SOC 2 Type II",
    description:
      "Service Organization Control 2 — Trust Services Criteria for security, availability, and confidentiality.",
    version: "2017",
    tagline: "Most common for SaaS",
    recommended: true,
  },
  {
    slug: "soc1",
    name: "SOC 1",
    description: "Service Organization Control 1 — financial reporting and ICFR.",
    version: "2017",
    tagline: "Financial controls",
  },
  {
    slug: "soc3",
    name: "SOC 3",
    description: "Public-facing trust report derived from SOC 2 work.",
    version: "2017",
    tagline: "Public trust report",
  },
  {
    slug: "hipaa",
    name: "HIPAA",
    description: "Health Insurance Portability and Accountability Act security and privacy rules.",
    version: "2013",
    tagline: "Health data",
  },
  {
    slug: "iso27001",
    name: "ISO 27001",
    description: "International standard for information security management systems.",
    version: "2022",
    tagline: "International ISMS",
  },
  {
    slug: "iso42001",
    name: "ISO 42001",
    description: "International standard for AI management systems and governance.",
    version: "2023",
    tagline: "AI governance",
    isNew: true,
  },
  {
    slug: "gdpr",
    name: "GDPR",
    description: "EU General Data Protection Regulation for personal data processing.",
    version: "2016",
    tagline: "EU privacy",
  },
  {
    slug: "pci-dss",
    name: "PCI DSS",
    description: "Payment Card Industry Data Security Standard for cardholder data.",
    version: "4.0",
    tagline: "Payment cards",
  },
  {
    slug: "fedramp",
    name: "FedRAMP",
    description: "US government cloud security authorization program.",
    version: "Rev 5",
    tagline: "US gov cloud",
  },
  {
    slug: "cmmc",
    name: "CMMC",
    description: "Cybersecurity Maturity Model Certification for defense supply chain.",
    version: "2.0",
    tagline: "Defense contractors",
  },
];

export const COMPLIANCE_FRAMEWORK_SLUGS = COMPLIANCE_FRAMEWORKS.map((f) => f.slug);
