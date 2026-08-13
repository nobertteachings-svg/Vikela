/**
 * Cross-framework control graph, maps canonical Vikela controls (SOC 2 codes)
 * to each compliance framework's requirement identifiers.
 * One scan finding on CC6.1 satisfies SOC 2, HIPAA, ISO 27001, etc.
 */
export type FrameworkControlMapping = {
  controlCode: string;
  requirement: string;
};

/** Canonical control codes seeded in the database (SOC 2 Trust Services Criteria). */
export const CANONICAL_CONTROL_CODES = [
  "CC1.1", "CC1.2", "CC1.3", "CC1.4", "CC1.5",
  "CC2.1", "CC2.2", "CC2.3",
  "CC3.1", "CC3.2", "CC3.3", "CC3.4",
  "CC4.1", "CC4.2",
  "CC5.1", "CC5.2", "CC5.3",
  "CC6.1", "CC6.2", "CC6.3", "CC6.4", "CC6.5", "CC6.6", "CC6.7", "CC6.8",
  "CC7.1", "CC7.2", "CC7.3", "CC7.4", "CC7.5",
  "CC8.1",
  "CC9.1", "CC9.2",
  "A1.1", "A1.2", "A1.3",
  "C1.1", "C1.2",
  "PI1.1", "PI1.2",
  "P1.1", "P2.1", "P3.1", "P4.1", "P5.1", "P6.1", "P7.1", "P8.1",
] as const;

export type CanonicalControlCode = (typeof CANONICAL_CONTROL_CODES)[number];

function mapCodes(
  codes: readonly string[],
  requirement: (code: string) => string
): FrameworkControlMapping[] {
  return codes.map((controlCode) => ({ controlCode, requirement: requirement(controlCode) }));
}

const ACCESS = ["CC6.1", "CC6.2", "CC6.3", "CC6.4", "CC6.5", "CC6.6", "CC6.8"] as const;
const ENCRYPTION = ["CC6.7", "C1.1", "C1.2"] as const;
const MONITORING = ["CC7.1", "CC7.2", "CC7.3", "CC7.4", "CC7.5"] as const;
const CHANGE = ["CC8.1", "CC5.2"] as const;
const RISK = ["CC3.1", "CC3.2", "CC3.3", "CC3.4", "CC9.1", "CC9.2"] as const;
const GOVERNANCE = ["CC1.1", "CC1.2", "CC1.3", "CC1.4", "CC1.5", "CC2.1", "CC2.2", "CC2.3"] as const;
const PRIVACY = ["P1.1", "P2.1", "P3.1", "P4.1", "P5.1", "P6.1", "P7.1", "P8.1"] as const;
const AVAILABILITY = ["A1.1", "A1.2", "A1.3"] as const;
const PROCESSING = ["PI1.1", "PI1.2"] as const;

const HIPAA_MAP: Record<string, string> = {
  "CC6.1": "§164.312(a)(1) Access control",
  "CC6.2": "§164.308(a)(4) Authorization and supervision",
  "CC6.3": "§164.308(a)(3) Workforce termination",
  "CC6.4": "§164.310(a)(1) Facility access controls",
  "CC6.5": "§164.310(d)(1) Device and media controls",
  "CC6.6": "§164.312(e)(1) Transmission security",
  "CC6.7": "§164.312(a)(2)(iv) Encryption and decryption",
  "CC6.8": "§164.308(a)(5) Protection from malicious software",
  "CC7.1": "§164.312(b) Audit controls",
  "CC7.2": "§164.308(a)(1)(ii)(D) Information system activity review",
  "CC7.3": "§164.308(a)(6) Security incident procedures",
  "CC7.4": "§164.308(a)(6)(ii) Response and mitigation",
  "CC7.5": "§164.308(a)(7) Contingency plan",
  "CC8.1": "§164.308(a)(8) Evaluation",
  "CC9.1": "§164.308(a)(7)(ii)(A) Data backup plan",
  "CC9.2": "§164.308(b)(1) Business associate contracts",
  "C1.1": "§164.514(b) Minimum necessary",
  "C1.2": "§164.310(d)(2) Media disposal",
  "P1.1": "§164.520 Privacy notice",
  "P2.1": "§164.508 Uses and disclosures",
  "P3.1": "§164.502(b) Minimum necessary",
  "P4.1": "§164.502(a) Permitted uses",
  "P5.1": "§164.530(j) Retention",
  "P6.1": "§164.502(b) Disclosure limitations",
  "P7.1": "§164.526 Amendment of PHI",
  "P8.1": "§164.524 Access to PHI",
  "CC4.1": "§164.308(a)(8) Periodic evaluation",
  "CC4.2": "§164.316 Policies and procedures",
};

const ISO27001_MAP: Record<string, string> = {
  "CC1.1": "A.5.1 Policies for information security",
  "CC1.2": "A.5.4 Management responsibilities",
  "CC1.3": "A.5.2 Information security roles",
  "CC1.4": "A.6.1 Screening",
  "CC1.5": "A.6.2 Terms and conditions of employment",
  "CC2.1": "A.5.24 Information security incident management planning",
  "CC2.2": "A.5.32 Intellectual property rights",
  "CC2.3": "A.5.5 Contact with authorities",
  "CC3.1": "A.5.7 Threat intelligence",
  "CC3.2": "A.5.8 Information security in project management",
  "CC3.3": "A.5.34 Privacy and PII protection",
  "CC3.4": "A.8.32 Change management",
  "CC4.1": "A.5.36 Compliance with policies",
  "CC4.2": "A.5.35 Independent review of information security",
  "CC5.1": "A.5.37 Documented operating procedures",
  "CC5.2": "A.8.9 Configuration management",
  "CC5.3": "A.5.3 Segregation of duties",
  "CC6.1": "A.8.5 Secure authentication",
  "CC6.2": "A.5.15 Access control",
  "CC6.3": "A.5.18 Access rights",
  "CC6.4": "A.7.1 Physical security perimeters",
  "CC6.5": "A.7.10 Storage media",
  "CC6.6": "A.8.20 Networks security",
  "CC6.7": "A.8.24 Use of cryptography",
  "CC6.8": "A.8.7 Protection against malware",
  "CC7.1": "A.8.15 Logging",
  "CC7.2": "A.8.16 Monitoring activities",
  "CC7.3": "A.5.24 Incident management planning",
  "CC7.4": "A.5.26 Response to information security incidents",
  "CC7.5": "A.5.29 Information security during disruption",
  "CC8.1": "A.8.32 Change management",
  "CC9.1": "A.5.29 Business continuity",
  "CC9.2": "A.5.19 Supplier relationships",
  "A1.1": "A.8.6 Capacity management",
  "A1.2": "A.7.11 Supporting utilities",
  "A1.3": "A.5.30 ICT readiness for business continuity",
  "C1.1": "A.5.12 Classification of information",
  "C1.2": "A.7.14 Secure disposal",
  "P1.1": "A.5.34 Privacy and PII protection",
  "P3.1": "A.5.34 Privacy and PII protection",
  "P5.1": "A.5.33 Protection of records",
  "P8.1": "A.5.34 Privacy and PII protection",
};

const ISO42001_MAP: Record<string, string> = {
  "CC1.1": "A.5.1 AI policies and governance",
  "CC1.2": "A.5.2 AI roles and accountability",
  "CC2.1": "A.5.3 AI system communication",
  "CC3.1": "A.6.1 AI risk assessment",
  "CC3.2": "A.6.2 AI impact assessment",
  "CC4.1": "A.7.1 AI system monitoring",
  "CC5.1": "A.8.1 AI operational controls",
  "CC5.2": "A.8.2 AI change management",
  "CC6.1": "A.9.1 AI access control",
  "CC6.7": "A.9.2 AI data protection",
  "CC7.1": "A.10.1 AI logging and traceability",
  "CC7.2": "A.10.2 AI performance monitoring",
  "CC7.3": "A.11.1 AI incident handling",
  "CC8.1": "A.8.3 AI model lifecycle management",
  "CC9.2": "A.12.1 Third-party AI vendor management",
  "P1.1": "A.13.1 AI transparency and disclosure",
  "P3.1": "A.13.2 Personal data in AI systems",
  "P4.1": "A.13.3 Purpose limitation for AI processing",
};

const GDPR_MAP: Record<string, string> = {
  "P1.1": "Art. 13-14 Transparency and information",
  "P2.1": "Art. 7 Conditions for consent",
  "P3.1": "Art. 5(1)(c) Data minimisation",
  "P4.1": "Art. 5(1)(b) Purpose limitation",
  "P5.1": "Art. 5(1)(e) Storage limitation",
  "P6.1": "Art. 28 Processor agreements",
  "P7.1": "Art. 16 Right to rectification",
  "P8.1": "Art. 15 Right of access",
  "CC6.1": "Art. 32(1)(b) Access control",
  "CC6.2": "Art. 32(1)(b) User authentication",
  "CC6.3": "Art. 32(1)(d) Access revocation",
  "CC6.7": "Art. 32(1)(a) Encryption of personal data",
  "CC7.1": "Art. 32(1)(d) Logging and monitoring",
  "CC7.3": "Art. 33 Breach notification",
  "CC7.4": "Art. 33-34 Breach response",
  "CC9.2": "Art. 28 Sub-processor management",
  "CC2.2": "Art. 13 Privacy notice to data subjects",
  "C1.1": "Art. 5(1)(f) Integrity and confidentiality",
  "C1.2": "Art. 17 Right to erasure",
};

const PCI_MAP: Record<string, string> = {
  "CC6.1": "Req 7 Restrict access to cardholder data",
  "CC6.2": "Req 8 Identify and authenticate access",
  "CC6.3": "Req 8.2.5 Remove inactive users",
  "CC6.4": "Req 9 Restrict physical access",
  "CC6.6": "Req 1 Install and maintain network security controls",
  "CC6.7": "Req 3 Protect stored account data",
  "CC6.8": "Req 5 Protect systems against malware",
  "CC7.1": "Req 10 Log and monitor access",
  "CC7.2": "Req 10.6 Review logs",
  "CC7.4": "Req 12.10 Incident response plan",
  "CC8.1": "Req 6.4 Change control procedures",
  "CC9.1": "Req 12.10.1 Incident response testing",
  "CC9.2": "Req 12.8 Third-party service provider management",
  "CC5.2": "Req 2.2 Secure system configurations",
  "CC3.2": "Req 12.3 Targeted risk analysis",
  "CC4.1": "Req 12.3.1 Vulnerability scanning",
};

const FEDRAMP_MAP: Record<string, string> = {
  "CC6.1": "AC-2 Account management",
  "CC6.2": "AC-3 Access enforcement",
  "CC6.3": "AC-2(3) Disable inactive accounts",
  "CC6.6": "SC-7 Boundary protection",
  "CC6.7": "SC-13 Cryptographic protection",
  "CC6.8": "SI-3 Malicious code protection",
  "CC7.1": "AU-2 Audit events",
  "CC7.2": "AU-6 Audit review and analysis",
  "CC7.3": "IR-4 Incident handling",
  "CC7.4": "IR-5 Incident monitoring",
  "CC7.5": "CP-2 Contingency plan",
  "CC8.1": "CM-3 Configuration change control",
  "CC9.1": "CP-9 System backup",
  "CC9.2": "SA-9 External system services",
  "CC3.1": "RA-3 Risk assessment",
  "CC3.2": "RA-5 Vulnerability scanning",
  "CC4.1": "CA-7 Continuous monitoring",
  "CC5.2": "CM-2 Baseline configuration",
  "A1.1": "SC-5 Denial of service protection",
  "A1.2": "PE-9 Power equipment",
  "A1.3": "CP-4 Contingency plan testing",
};

const CMMC_MAP: Record<string, string> = {
  "CC6.1": "AC.L2-3.1.1 Authorized access control",
  "CC6.2": "AC.L2-3.1.2 Transaction and function control",
  "CC6.3": "AC.L2-3.1.6 Least privilege",
  "CC6.6": "SC.L2-3.13.1 Boundary protection",
  "CC6.7": "SC.L2-3.13.11 Cryptographic protection",
  "CC6.8": "SI.L2-3.14.2 Malicious code protection",
  "CC7.1": "AU.L2-3.3.1 System auditing",
  "CC7.2": "AU.L2-3.3.2 Audit record review",
  "CC7.3": "IR.L2-3.6.1 Incident handling",
  "CC7.4": "IR.L2-3.6.2 Incident reporting",
  "CC8.1": "CM.L2-3.4.2 Security configuration settings",
  "CC9.2": "CA.L2-3.12.4 System security plan",
  "CC3.1": "RM.L2-3.11.2 Vulnerability scan",
  "CC3.2": "RM.L2-3.11.3 Remediate vulnerabilities",
  "CC5.2": "CM.L2-3.4.1 System baselines",
  "CC1.1": "AT.L2-3.2.1 Role-based security training",
  "CC1.4": "PS.L2-3.9.1 Screen personnel",
};

const SOC1_MAP: Record<string, string> = {
  "CC1.1": "Control Environment: Integrity",
  "CC1.2": "Control Environment: Board oversight",
  "CC2.1": "Communication: Internal",
  "CC3.1": "Risk Assessment: Objectives",
  "CC5.1": "Control Activities: Selection",
  "CC5.2": "Control Activities: Technology",
  "CC8.1": "Change Management",
  "PI1.1": "Processing Integrity: Completeness",
  "PI1.2": "Processing Integrity: Accuracy",
  "CC9.2": "Vendor Management",
  "CC4.1": "Monitoring: Ongoing evaluations",
  "CC4.2": "Monitoring: Deficiency communication",
};

/** Framework slug → control mappings (excludes soc2, seeded from SOC2_CONTROLS). */
export const FRAMEWORK_CONTROL_MAPPINGS: Record<string, FrameworkControlMapping[]> = {
  soc1: mapCodes(Object.keys(SOC1_MAP), (c) => SOC1_MAP[c] ?? c),
  soc3: mapCodes(CANONICAL_CONTROL_CODES, (c) => `SOC 3 Trust Report: ${c}`),
  hipaa: mapCodes(Object.keys(HIPAA_MAP), (c) => HIPAA_MAP[c] ?? c),
  iso27001: mapCodes(Object.keys(ISO27001_MAP), (c) => ISO27001_MAP[c] ?? c),
  iso42001: mapCodes(Object.keys(ISO42001_MAP), (c) => ISO42001_MAP[c] ?? c),
  gdpr: mapCodes(Object.keys(GDPR_MAP), (c) => GDPR_MAP[c] ?? c),
  "pci-dss": mapCodes(Object.keys(PCI_MAP), (c) => PCI_MAP[c] ?? c),
  fedramp: mapCodes(Object.keys(FEDRAMP_MAP), (c) => FEDRAMP_MAP[c] ?? c),
  cmmc: mapCodes(Object.keys(CMMC_MAP), (c) => CMMC_MAP[c] ?? c),
};

/** Controls shared across technical security scanning (code, cloud, identity). */
export const SCANNER_MAPPED_CODES = [
  ...ACCESS,
  ...ENCRYPTION,
  ...MONITORING,
  ...CHANGE,
] as const;

export function mappingsForFramework(slug: string): FrameworkControlMapping[] {
  return FRAMEWORK_CONTROL_MAPPINGS[slug] ?? [];
}

export function controlCountForFramework(slug: string): number {
  if (slug === "soc2") return CANONICAL_CONTROL_CODES.length;
  return mappingsForFramework(slug).length;
}
