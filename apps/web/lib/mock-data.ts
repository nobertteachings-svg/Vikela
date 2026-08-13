/**
 * Legacy mock datasets — do not use for production UI structure; prefer product-config / billing-plans.
 */
export {
  navItems,
  settingsTabs,
  teamRoles,
  riskMatrixLabels,
  type SettingsTab,
  type TeamRole,
  type RiskStatus,
  type VendorStatus,
} from "./product-config";
export { billingPlans, type BillingPlanId } from "./billing-plans";

import type { RiskStatus, TeamRole, VendorStatus } from "./product-config";
import type { BillingPlanId } from "./billing-plans";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ControlStatus = "passing" | "failing" | "in_progress" | "not_started";
export type GapStatus = "open" | "in_progress" | "resolved";

export const dashboardStats = {
  openGaps: 23,
  controlsMet: 148,
  activeFrameworks: 2,
  auditInDays: 47,
  postureScore: 74,
};

export const frameworkReadiness = [
  { name: "SOC 2 Type II", percent: 74, color: "purple" as const },
  { name: "HIPAA", percent: 41, color: "green" as const },
  { name: "ISO 27001", percent: 0, label: "Not started" },
];

export const recentActivity = [
  { time: "2h ago", icon: "scan", text: "Scan completed — api-service · 3 new gaps" },
  { time: "5h ago", icon: "document", text: "Policy updated — Access Control Policy v2.1" },
  { time: "1d ago", icon: "check", text: "Control evidence approved — CC6.1" },
  { time: "2d ago", icon: "alert", text: "New gap — Hardcoded AWS key in config.py" },
];

export const topGaps = [
  { severity: "CRITICAL" as Severity, gap: "Hardcoded AWS secret key", control: "CC6.1", framework: "SOC 2", assigned: "eng@co.com", status: "Open" },
  { severity: "HIGH" as Severity, gap: "Missing encryption at rest", control: "CC9.1", framework: "SOC 2, HIPAA", assigned: "—", status: "In progress" },
  { severity: "HIGH" as Severity, gap: "No MFA enforced", control: "CC6.1", framework: "SOC 2", assigned: "—", status: "Open" },
  { severity: "MEDIUM" as Severity, gap: "Dependency with known CVE", control: "CC7.1", framework: "SOC 2", assigned: "—", status: "Open" },
  { severity: "MEDIUM" as Severity, gap: "No audit logging", control: "CC7.2", framework: "SOC 2", assigned: "—", status: "In progress" },
];

export const frameworks = [
  { id: "soc2", name: "SOC 2 Type II", percent: 74, status: "Active", met: 148, total: 200, recommended: true },
  { id: "hipaa", name: "HIPAA", percent: 41, status: "Active", met: 62, total: 150 },
  { id: "iso27001", name: "ISO 27001", percent: 0, status: "Not started", met: 0, total: 114 },
  { id: "iso42001", name: "ISO 42001", percent: 0, status: "Not started", met: 0, total: 48 },
  { id: "gdpr", name: "GDPR", percent: 0, status: "Not started", met: 0, total: 99 },
  { id: "pci", name: "PCI DSS", percent: 0, status: "Not started", met: 0, total: 78 },
];

export const onboardingFrameworks = [
  { id: "soc2", name: "SOC 2 Type II", description: "Trust services criteria for SaaS startups", recommended: true },
  { id: "hipaa", name: "HIPAA", description: "Healthcare data protection requirements" },
  { id: "iso27001", name: "ISO 27001", description: "Information security management system" },
  { id: "iso42001", name: "ISO 42001", description: "AI management system standard" },
  { id: "gdpr", name: "GDPR", description: "EU personal data protection regulation" },
  { id: "pci", name: "PCI DSS", description: "Payment card industry security standard" },
];

export const mockRepos = [
  { id: "api-service", name: "acme/api-service", default: true },
  { id: "backend", name: "acme/backend" },
  { id: "infra-terraform", name: "acme/infra-terraform" },
  { id: "auth-service", name: "acme/auth-service" },
];

export const controls = [
  { id: "CC6.1", name: "Logical access controls", frameworks: ["SOC 2", "ISO 27001"], status: "failing" as ControlStatus, evidence: 2, owner: "sarah@acme.io", updated: "2025-05-18" },
  { id: "CC6.3", name: "Access review process", frameworks: ["SOC 2"], status: "passing" as ControlStatus, evidence: 4, owner: "sarah@acme.io", updated: "2025-05-15" },
  { id: "CC6.6", name: "Network segmentation", frameworks: ["SOC 2"], status: "in_progress" as ControlStatus, evidence: 1, owner: "devops@acme.io", updated: "2025-05-12" },
  { id: "CC7.1", name: "Vulnerability management", frameworks: ["SOC 2"], status: "failing" as ControlStatus, evidence: 0, owner: "eng@acme.io", updated: "2025-05-20" },
  { id: "CC7.2", name: "Security monitoring", frameworks: ["SOC 2", "HIPAA"], status: "in_progress" as ControlStatus, evidence: 2, owner: "devops@acme.io", updated: "2025-05-19" },
  { id: "CC9.1", name: "Encryption at rest", frameworks: ["SOC 2", "HIPAA"], status: "failing" as ControlStatus, evidence: 1, owner: "devops@acme.io", updated: "2025-05-17" },
  { id: "CC8.1", name: "Change management", frameworks: ["SOC 2"], status: "passing" as ControlStatus, evidence: 5, owner: "eng@acme.io", updated: "2025-05-10" },
  { id: "A.9.1", name: "Access control policy", frameworks: ["ISO 27001"], status: "not_started" as ControlStatus, evidence: 0, owner: "—", updated: "—" },
  { id: "A.16.1", name: "Incident management", frameworks: ["ISO 27001"], status: "in_progress" as ControlStatus, evidence: 1, owner: "security@acme.io", updated: "2025-05-08" },
  { id: "164.312", name: "Technical safeguards", frameworks: ["HIPAA"], status: "in_progress" as ControlStatus, evidence: 2, owner: "sarah@acme.io", updated: "2025-05-14" },
];

export const controlDetails: Record<string, { description: string; mapped: string[]; evidence: { name: string; type: string; date: string }[] }> = {
  "CC6.1": {
    description:
      "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.",
    mapped: ["SOC 2 CC6.1", "ISO 27001 A.9.1"],
    evidence: [
      { name: "mfa_screenshot_okta.png", type: "Screenshot", date: "2025-04-12" },
      { name: "access_review_q1.pdf", type: "Document", date: "2025-03-28" },
    ],
  },
};

export const gaps = [
  { id: "gap-1", severity: "CRITICAL" as Severity, finding: "Hardcoded AWS_SECRET_KEY", repo: "api-service", file: "config/settings.py:14", control: "CC6.1", framework: "SOC 2", status: "open" as GapStatus, assigned: "eng@acme.io" },
  { id: "gap-2", severity: "CRITICAL" as Severity, finding: "Unencrypted S3 bucket", repo: "infra-terraform", file: "main.tf:89", control: "CC9.1", framework: "SOC 2, HIPAA", status: "open" as GapStatus, assigned: "devops@acme.io" },
  { id: "gap-3", severity: "HIGH" as Severity, finding: "No MFA on root AWS account", repo: "—", file: "—", control: "CC6.1", framework: "SOC 2", status: "open" as GapStatus, assigned: "—" },
  { id: "gap-4", severity: "HIGH" as Severity, finding: "log4j 2.14.1 (CVE-2021-44228)", repo: "backend", file: "pom.xml:34", control: "CC7.1", framework: "SOC 2", status: "in_progress" as GapStatus, assigned: "eng@acme.io" },
  { id: "gap-5", severity: "HIGH" as Severity, finding: "Missing audit log for user login", repo: "auth-service", file: "routes/auth.js:67", control: "CC7.2", framework: "SOC 2", status: "open" as GapStatus, assigned: "—" },
  { id: "gap-6", severity: "MEDIUM" as Severity, finding: "SSH port 22 open to 0.0.0.0/0", repo: "infra-terraform", file: "security_groups.tf:12", control: "CC6.6", framework: "SOC 2", status: "open" as GapStatus, assigned: "devops@acme.io" },
  { id: "gap-7", severity: "MEDIUM" as Severity, finding: "No rate limiting on /api/login", repo: "api-service", file: "middleware/index.js:3", control: "CC6.1", framework: "SOC 2", status: "open" as GapStatus, assigned: "—" },
];

export const gapDetails: Record<string, { meaning: string; fix: string[]; files: string[]; history: { date: string; event: string }[] }> = {
  "gap-1": {
    meaning:
      "A hardcoded AWS secret key in source code violates CC6.1. Anyone with repo access can exfiltrate credentials. Auditors will flag this as a critical finding.",
    fix: [
      "Rotate the exposed AWS access key immediately in IAM.",
      "Remove the secret from config/settings.py and commit the fix.",
      "Store credentials in AWS Secrets Manager or environment variables injected at deploy time.",
      "Enable git-secrets or TruffleHog in CI to prevent future commits.",
    ],
    files: ["config/settings.py:14", "config/settings.py"],
    history: [
      { date: "2025-05-20 14:32", event: "Detected by code scan on push to main" },
      { date: "2025-05-20 14:35", event: "Severity escalated to CRITICAL" },
      { date: "2025-05-21 09:10", event: "Assigned to eng@acme.io" },
    ],
  },
};

export const gapSummary = { critical: 5, high: 11, medium: 7 };

export const scans = [
  { id: "s1", date: "2025-05-20", trigger: "push", branch: "main", repos: 4, gaps: 3, score: 74, status: "Completed" },
  { id: "s2", date: "2025-05-18", trigger: "scheduled", branch: "—", repos: 4, gaps: 1, score: 72, status: "Completed" },
  { id: "s3", date: "2025-05-15", trigger: "push", branch: "feature/auth", repos: 2, gaps: 5, score: 70, status: "Completed" },
  { id: "s4", date: "2025-05-12", trigger: "manual", branch: "—", repos: 4, gaps: 0, score: 71, status: "Completed" },
  { id: "s5", date: "2025-05-10", trigger: "push", branch: "main", repos: 4, gaps: 2, score: 69, status: "Completed" },
  { id: "s6", date: "2025-05-08", trigger: "scheduled", branch: "—", repos: 3, gaps: 4, score: 67, status: "Completed" },
  { id: "s7", date: "2025-05-05", trigger: "push", branch: "main", repos: 3, gaps: 0, score: 65, status: "Failed" },
  { id: "s8", date: "2025-05-03", trigger: "manual", branch: "—", repos: 4, gaps: 0, score: 0, status: "In progress" },
];

export const postureTrend = [
  { week: "Mar 24", score: 51 },
  { week: "Mar 31", score: 54 },
  { week: "Apr 7", score: 58 },
  { week: "Apr 14", score: 61 },
  { week: "Apr 21", score: 64 },
  { week: "Apr 28", score: 68 },
  { week: "May 5", score: 71 },
  { week: "May 12", score: 74 },
];

export const evidenceItems = [
  { id: "e1", name: "mfa_screenshot_okta.png", control: "CC6.1", type: "Screenshot", date: "2025-04-12", by: "sarah@acme.io", status: "Approved" },
  { id: "e2", name: "aws_cloudtrail_export_may.csv", control: "CC7.2", type: "Log export", date: "2025-05-01", by: "devops@acme.io", status: "Approved" },
  { id: "e3", name: "encryption_config_screenshot.png", control: "CC9.1", type: "Screenshot", date: "2025-05-15", by: "devops@acme.io", status: "Pending review" },
  { id: "e4", name: "access_review_q1.pdf", control: "CC6.3", type: "Document", date: "2025-03-28", by: "sarah@acme.io", status: "Approved" },
  { id: "e5", name: "incident_response_test.pdf", control: "A.16.1", type: "Document", date: "2025-05-08", by: "security@acme.io", status: "Pending review" },
  { id: "e6", name: "vpc_flow_logs_export.json", control: "CC6.6", type: "API output", date: "2025-05-10", by: "devops@acme.io", status: "Approved" },
];

export const policies = [
  { id: "access", name: "Access Control Policy", status: "Published", updated: "2025-05-15", content: `# Access Control Policy\n\n## Purpose\nThis policy defines how Acme Corp manages logical access to production systems and customer data.\n\n## Scope\nAll employees, contractors, and systems with access to production environments.\n\n## Policy\n1. All production access requires MFA via Okta.\n2. Access is granted on least-privilege basis with manager approval.\n3. Quarterly access reviews are conducted for all privileged accounts.\n4. Service accounts use IAM roles — never long-lived access keys in code.` },
  { id: "incident", name: "Incident Response Plan", status: "Published", updated: "2025-04-20", content: `# Incident Response Plan\n\n## Detection\nSecurity events are monitored via Datadog and AWS CloudTrail.\n\n## Response\n1. Triage within 15 minutes for critical alerts.\n2. Engage security lead and engineering on-call.\n3. Document timeline in incident tracker.\n4. Post-mortem within 5 business days.` },
  { id: "change", name: "Change Management Policy", status: "Draft", updated: "2025-05-18", content: `# Change Management Policy\n\n## Overview\nAll production changes require peer review and automated CI checks before merge.` },
  { id: "data", name: "Data Classification Policy", status: "Draft", updated: "2025-05-10", content: `# Data Classification Policy\n\n## Classifications\n- Public, Internal, Confidential, Restricted (PII/PHI).` },
  { id: "vendor", name: "Vendor Management Policy", status: "Draft", updated: "2025-05-05", content: `# Vendor Management Policy\n\n## Requirements\nAll vendors handling customer data must provide SOC 2 Type II reports annually.` },
  { id: "bcp", name: "Business Continuity Plan", status: "Not started", updated: "—", content: "" },
];

export const copilotSessions = [
  { id: "c1", title: "Why did we fail CC6.1?" },
  { id: "c2", title: "Vendor questionnaire for Stripe" },
  { id: "c3", title: "Evidence needed for CC7.2" },
];

export const copilotSuggestions = [
  "Why did we fail CC6.1?",
  "Generate a vendor security questionnaire response",
  "What evidence does an auditor need for CC7.2?",
  "Explain what hardcoded secrets mean for our audit",
  "What's our biggest risk right now?",
];

export const remediationPlans = [
  { id: "r1", gap: "Hardcoded AWS secret key", severity: "CRITICAL" as Severity, steps: ["Rotate IAM key", "Remove from settings.py", "Add Secrets Manager", "Enable secret scanning in CI"], hours: "~2 hours", status: "In progress" },
  { id: "r2", gap: "Unencrypted S3 bucket", severity: "CRITICAL" as Severity, steps: ["Enable default encryption on bucket", "Apply bucket policy denying unencrypted uploads", "Re-scan terraform state"], hours: "~1 hour", status: "Not started" },
  { id: "r3", gap: "No MFA on root AWS account", severity: "HIGH" as Severity, steps: ["Enable hardware MFA on root", "Create break-glass procedure doc", "Remove root access keys"], hours: "~30 min", status: "Not started" },
  { id: "r4", gap: "log4j CVE-2021-44228", severity: "HIGH" as Severity, steps: ["Upgrade log4j to 2.17.1+", "Run dependency scan", "Deploy patched build"], hours: "~3 hours", status: "Done" },
];

export const risks = [
  {
    id: "risk-1",
    name: "Customer data breach",
    category: "Security",
    likelihood: "Medium",
    impact: "High",
    score: 12,
    owner: "security@acme.io",
    mitigation: "Encryption at rest, access controls, Datadog monitoring, annual pentest",
    status: "Open" as RiskStatus,
    matrix: { l: 2, i: 3 },
    description: "Unauthorized access to customer PII in production databases or backups.",
    nextReview: "2025-06-15",
    controls: ["CC6.1", "CC9.1"],
  },
  {
    id: "risk-2",
    name: "Insider threat",
    category: "Personnel",
    likelihood: "Low",
    impact: "High",
    score: 9,
    owner: "sarah@acme.io",
    mitigation: "Quarterly access reviews, least privilege IAM, offboarding checklist",
    status: "Mitigating" as RiskStatus,
    matrix: { l: 1, i: 3 },
    description: "Malicious or negligent access by employees with production permissions.",
    nextReview: "2025-07-01",
    controls: ["CC6.3"],
  },
  {
    id: "risk-3",
    name: "Third-party vendor compromise",
    category: "Vendor",
    likelihood: "Medium",
    impact: "Medium",
    score: 8,
    owner: "sarah@acme.io",
    mitigation: "SOC 2 reviews, DPAs, vendor inventory in Vikela",
    status: "Open" as RiskStatus,
    matrix: { l: 2, i: 2 },
    description: "Supply-chain breach via subprocessors with access to customer data.",
    nextReview: "2025-06-01",
    controls: ["CC9.2"],
  },
  {
    id: "risk-4",
    name: "Ransomware attack",
    category: "Security",
    likelihood: "Low",
    impact: "High",
    score: 9,
    owner: "devops@acme.io",
    mitigation: "Immutable backups, EDR, network segmentation, IR tabletop Q2",
    status: "Open" as RiskStatus,
    matrix: { l: 1, i: 3 },
    description: "Encryption of production systems and extortion for restore keys.",
    nextReview: "2025-06-20",
    controls: ["CC7.2", "A.16.1"],
  },
  {
    id: "risk-5",
    name: "SOC 2 audit failure",
    category: "Compliance",
    likelihood: "Medium",
    impact: "High",
    score: 12,
    owner: "security@acme.io",
    mitigation: "Gap remediation sprint, evidence collection, auditor pre-read",
    status: "Mitigating" as RiskStatus,
    matrix: { l: 2, i: 3 },
    description: "Failure to meet Trust Services Criteria during Type II observation period.",
    nextReview: "2025-05-28",
    controls: ["CC6.1", "CC7.1", "CC8.1"],
  },
  {
    id: "risk-6",
    name: "Service outage",
    category: "Operations",
    likelihood: "Medium",
    impact: "Medium",
    score: 8,
    owner: "devops@acme.io",
    mitigation: "Multi-AZ deployment, runbooks, status page, on-call rotation",
    status: "Accepted" as RiskStatus,
    matrix: { l: 2, i: 2 },
    description: "Extended downtime affecting customer SLA and availability commitments.",
    nextReview: "2025-08-01",
    controls: ["CC7.4"],
  },
  {
    id: "risk-7",
    name: "AI model data leakage",
    category: "Security",
    likelihood: "Low",
    impact: "Medium",
    score: 6,
    owner: "eng@acme.io",
    mitigation: "Prompt logging review, PII redaction in Copilot, ISO 42001 controls",
    status: "Open" as RiskStatus,
    matrix: { l: 1, i: 2 },
    description: "Customer data exposed via LLM prompts or training pipelines.",
    nextReview: "2025-06-30",
    controls: ["ISO 42001 A.8"],
  },
];

export const vendors = [
  {
    id: "aws",
    name: "AWS",
    category: "Cloud infrastructure",
    risk: "Low",
    lastReview: "2025-01-15",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Infrastructure & logs",
    contractRenewal: "2026-01-01",
    owner: "devops@acme.io",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    risk: "Low",
    lastReview: "2025-03-10",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Payment metadata",
    contractRenewal: "2025-12-01",
    owner: "sarah@acme.io",
  },
  {
    id: "github",
    name: "GitHub",
    category: "Dev tooling",
    risk: "Low",
    lastReview: "2025-04-22",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Source code",
    contractRenewal: "2025-11-01",
    owner: "eng@acme.io",
  },
  {
    id: "okta",
    name: "Okta",
    category: "Identity",
    risk: "Low",
    lastReview: "2025-02-18",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Employee directory",
    contractRenewal: "2026-03-01",
    owner: "sarah@acme.io",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    risk: "Medium",
    lastReview: null,
    soc2: false,
    status: "Review needed" as VendorStatus,
    dataAccess: "Customer contacts",
    contractRenewal: "2025-09-01",
    owner: "sarah@acme.io",
  },
  {
    id: "retool",
    name: "Retool",
    category: "Internal tools",
    risk: "Medium",
    lastReview: null,
    soc2: false,
    status: "Not reviewed" as VendorStatus,
    dataAccess: "Production DB read",
    contractRenewal: "2025-07-15",
    owner: "eng@acme.io",
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "Observability",
    risk: "Low",
    lastReview: "2025-05-01",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Logs & metrics",
    contractRenewal: "2026-02-01",
    owner: "devops@acme.io",
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "AI provider",
    risk: "Medium",
    lastReview: "2025-04-05",
    soc2: true,
    status: "Approved" as VendorStatus,
    dataAccess: "Prompts (no retention)",
    contractRenewal: "2025-10-01",
    owner: "eng@acme.io",
  },
];

export const vendorDetails: Record<
  string,
  {
    score: number;
    questionnaire: string;
    documents: string[];
    notes: string;
    dataProcessing: boolean;
    subprocessors: string[];
  }
> = {
  aws: {
    score: 95,
    questionnaire: "45/45 complete",
    documents: ["SOC 2 Type II 2024", "DPA signed", "BAA N/A"],
    notes: "Primary cloud provider. Cross-account IAM for scanning only.",
    dataProcessing: true,
    subprocessors: ["Amazon CloudFront", "AWS KMS"],
  },
  stripe: {
    score: 92,
    questionnaire: "45/45 complete",
    documents: ["SOC 2 Type II 2024", "DPA signed"],
    notes: "PCI DSS Level 1 service provider. No card data stored on Acme systems.",
    dataProcessing: true,
    subprocessors: ["Stripe Identity"],
  },
  salesforce: {
    score: 72,
    questionnaire: "12/45 questions answered",
    documents: ["NDA signed", "DPA pending"],
    notes: "Annual review overdue. Request updated SOC 2 and SIG Lite.",
    dataProcessing: true,
    subprocessors: ["Salesforce Einstein"],
  },
  retool: {
    score: 45,
    questionnaire: "Not started",
    documents: [],
    notes: "Production database connector requires security review before approval.",
    dataProcessing: true,
    subprocessors: [],
  },
  github: {
    score: 90,
    questionnaire: "Auto-synced from trust center",
    documents: ["SOC 2 Type II 2024"],
    notes: "GitHub App installation for org acme-corp.",
    dataProcessing: false,
    subprocessors: [],
  },
};

export const teamMembers = [
  {
    id: "tm-1",
    name: "Sarah Chen",
    email: "sarah@acme.io",
    role: "Admin" as TeamRole,
    department: "Security",
    mfa: true,
    lastActive: "2h ago",
    joined: "2023-08-15",
  },
  {
    id: "tm-2",
    name: "Marcus Webb",
    email: "eng@acme.io",
    role: "Member" as TeamRole,
    department: "Engineering",
    mfa: true,
    lastActive: "1h ago",
    joined: "2024-01-10",
  },
  {
    id: "tm-3",
    name: "Priya Patel",
    email: "devops@acme.io",
    role: "Member" as TeamRole,
    department: "Infrastructure",
    mfa: true,
    lastActive: "5h ago",
    joined: "2024-03-22",
  },
  {
    id: "tm-4",
    name: "Alex Kim",
    email: "security@acme.io",
    role: "Admin" as TeamRole,
    department: "Security",
    mfa: true,
    lastActive: "1d ago",
    joined: "2024-06-01",
  },
  {
    id: "tm-5",
    name: "Jordan Lee",
    email: "auditor@firm.com",
    role: "Auditor" as TeamRole,
    department: "External",
    mfa: true,
    lastActive: "3d ago",
    joined: "2025-04-01",
  },
  {
    id: "tm-6",
    name: "Taylor Brooks",
    email: "taylor@acme.io",
    role: "Member" as TeamRole,
    department: "Product",
    mfa: false,
    lastActive: "2w ago",
    joined: "2024-11-05",
  },
];

export const teamPendingInvites = [
  { email: "new-hire@acme.io", role: "Member" as TeamRole, sent: "2025-05-18", expires: "2025-05-25" },
];

export const integrations = {
  connected: { name: "GitHub", repos: ["api-service", "backend", "infra-terraform", "auth-service"], status: "Connected" },
  available: [
    { id: "aws", name: "AWS", description: "Auto-pull CloudTrail, S3 configs", connected: false },
    { id: "okta", name: "Okta", description: "Pull user/MFA data", connected: false },
    { id: "slack", name: "Slack", description: "Gap alerts in channels", connected: false },
    { id: "jira", name: "Jira", description: "Create tickets for gaps", connected: false },
    { id: "google", name: "Google Workspace", description: "Employee list for training", connected: false },
    { id: "datadog", name: "Datadog", description: "Pull logging evidence", connected: false },
    { id: "vanta", name: "Vanta", description: "Import existing controls", connected: false },
  ],
};

export const settingsOrganization = {
  name: "Acme Corp",
  slug: "acme",
  id: "org_demo_acme",
  industry: "B2B SaaS",
  timezone: "America/Los_Angeles",
  website: "https://acme.io",
  createdAt: "2024-11-01",
  plan: "Growth",
  trustCenterSlug: "acme",
  dataRegion: "US",
  legalName: "Acme Corp, Inc.",
  employeeCount: "11–50",
};

export const settingsNotifications = [
  {
    id: "critical_gap",
    label: "New critical gap",
    description: "Immediate alert when a CRITICAL finding is detected in code or cloud.",
    email: true,
    slack: true,
  },
  {
    id: "scan_complete",
    label: "Scan complete",
    description: "Summary when a scheduled or push-triggered scan finishes.",
    email: true,
    slack: false,
  },
  {
    id: "audit_reminder",
    label: "Audit reminder",
    description: "Weekly digest of open gaps and framework readiness before audit windows.",
    email: true,
    slack: true,
  },
  {
    id: "evidence_expiring",
    label: "Evidence expiring",
    description: "Notify owners when uploaded evidence passes its review-by date.",
    email: true,
    slack: false,
  },
  {
    id: "policy_published",
    label: "Policy published",
    description: "When a policy moves from draft to published in your program.",
    email: false,
    slack: true,
  },
  {
    id: "integration_disconnected",
    label: "Integration disconnected",
    description: "If GitHub, cloud, or identity sync fails or credentials expire.",
    email: true,
    slack: true,
  },
];

export const settingsSecurity = {
  mfaRequired: true,
  sessionTimeoutHours: 12,
  ssoEnabled: false,
  ssoProvider: "Okta" as string | null,
  ipAllowlistEnabled: true,
  ipAllowlist: ["203.0.113.0/24", "198.51.100.42"],
  lastSecurityReview: "2025-05-01",
  passwordlessEnabled: true,
  auditLogRetentionDays: 365,
};

export const settingsApiKeys = [
  {
    id: "key_ci",
    name: "CI Scanner",
    prefix: "vik_sk_••••7f2a",
    scopes: ["scans:read", "gaps:read", "repos:read"],
    created: "2025-03-01",
    lastUsed: "2025-05-20",
    createdBy: "eng@acme.io",
  },
  {
    id: "key_tf",
    name: "Terraform Provider",
    prefix: "vik_sk_••••9b1c",
    scopes: ["integrations:read", "controls:read"],
    created: "2025-04-15",
    lastUsed: "2025-05-18",
    createdBy: "devops@acme.io",
  },
  {
    id: "key_audit",
    name: "Auditor export (read-only)",
    prefix: "vik_sk_••••3d8e",
    scopes: ["evidence:read", "controls:read", "gaps:read"],
    created: "2025-05-10",
    lastUsed: "2025-05-14",
    createdBy: "sarah@acme.io",
  },
];

export const settingsWebhooks = [
  {
    id: "wh_slack",
    name: "Slack — #security-alerts",
    url: "https://hooks.slack.com/services/T•••/B•••/xxx",
    events: ["gap.critical", "gap.high", "scan.complete"],
    status: "Active" as const,
    lastDelivery: "2025-05-20 14:32",
  },
  {
    id: "wh_jira",
    name: "Jira — Compliance board",
    url: "https://acme.atlassian.net/rest/api/2/issue",
    events: ["gap.critical", "gap.created"],
    status: "Active" as const,
    lastDelivery: "2025-05-19 09:15",
  },
  {
    id: "wh_pager",
    name: "PagerDuty",
    url: "https://events.pagerduty.com/v2/enqueue",
    events: ["gap.critical"],
    status: "Paused" as const,
    lastDelivery: "2025-05-12 22:01",
  },
];

export const settingsDangerZone = {
  exportFormats: ["JSON", "CSV", "Auditor package (ZIP)"],
  lastExport: "2025-05-15",
};

/** @deprecated Use settingsApiKeys */
export const apiKeys = settingsApiKeys.map(({ name, prefix, created, lastUsed }) => ({
  name,
  prefix,
  created,
  lastUsed,
}));

export const billingSubscription = {
  orgName: "Acme Corp",
  planId: "growth" as BillingPlanId,
  planName: "Growth",
  priceMonthly: 949,
  interval: "monthly" as const,
  status: "active" as const,
  renewalDate: "2025-06-01",
  billingEmail: "sarah@acme.io",
  billingContact: "Sarah Chen",
  seats: { used: 6, licensed: 10 },
  startedAt: "2024-11-01",
  annualSavings: 1598,
};

export const billingUsage = [
  {
    id: "scans",
    label: "Monthly scans",
    used: 42,
    limit: 100,
    unit: "scans",
    description: "Code, cloud, and identity scans across connected sources",
  },
  {
    id: "integrations",
    label: "Integrations",
    used: 4,
    limit: null as number | null,
    unit: "connected",
    description: "GitHub, AWS, Okta, and other evidence sources",
  },
  {
    id: "seats",
    label: "Team seats",
    used: 6,
    limit: 10,
    unit: "members",
    description: "Admin, member, and auditor roles in your workspace",
  },
  {
    id: "copilot",
    label: "Copilot messages",
    used: 128,
    limit: 500,
    unit: "messages",
    description: "AI remediation and questionnaire assistance this cycle",
  },
  {
    id: "evidence",
    label: "Evidence storage",
    used: 2.4,
    limit: 25,
    unit: "GB",
    description: "Uploaded artifacts, exports, and policy documents",
  },
];

export const billingPaymentMethod = {
  brand: "Visa",
  last4: "4242",
  expMonth: 8,
  expYear: 2027,
  name: "Sarah Chen",
  billingAddress: "548 Market St, San Francisco, CA 94104",
};

export const billingInvoices = [
  {
    id: "inv_2025_05",
    date: "2025-05-01",
    amount: "$949.00",
    status: "Paid" as const,
    description: "Growth plan — May 2025",
  },
  {
    id: "inv_2025_04",
    date: "2025-04-01",
    amount: "$949.00",
    status: "Paid" as const,
    description: "Growth plan — Apr 2025",
  },
  {
    id: "inv_2025_03",
    date: "2025-03-01",
    amount: "$949.00",
    status: "Paid" as const,
    description: "Growth plan — Mar 2025",
  },
  {
    id: "inv_2025_02",
    date: "2025-02-01",
    amount: "$949.00",
    status: "Paid" as const,
    description: "Growth plan — Feb 2025",
  },
  {
    id: "inv_2025_01",
    date: "2025-01-01",
    amount: "$329.00",
    status: "Paid" as const,
    description: "Starter plan — Jan 2025 (prorated upgrade)",
  },
  {
    id: "inv_2024_12",
    date: "2024-12-01",
    amount: "$329.00",
    status: "Paid" as const,
    description: "Starter plan — Dec 2024",
  },
];

export const billingAddons = [
  {
    id: "auditor",
    name: "Auditor portal",
    price: "$199/mo",
    description: "Read-only workspace for external auditors with export controls.",
    enabled: false,
  },
  {
    id: "hipaa-pack",
    name: "HIPAA evidence pack",
    price: "$99/mo",
    description: "Pre-mapped HIPAA controls and BAA template library.",
    enabled: true,
  },
  {
    id: "extra-seats",
    name: "Additional seats (5)",
    price: "$50/mo",
    description: "Extend beyond your plan's included seat count.",
    enabled: false,
  },
];

/** @deprecated Use billingInvoices */
export const invoices = billingInvoices.map(({ date, amount, status }) => ({
  date,
  amount,
  status,
}));

export const questionnaireRows = [
  { q: "Do you encrypt data at rest?", answer: "Yes. All production data stores use AES-256 encryption. S3 buckets have default encryption enabled.", status: "Approved" },
  { q: "How do you manage access to production?", answer: "Access via Okta SSO with MFA. Least-privilege IAM roles. Quarterly access reviews.", status: "Approved" },
  { q: "Describe your incident response process.", answer: "Documented IR plan with 15-min triage SLA. Post-mortems within 5 business days.", status: "Edit" },
  { q: "Do you perform penetration testing?", answer: "Annual third-party pentest. Last completed Q1 2025.", status: "Approved" },
  { q: "How is customer data segregated?", answer: "Multi-tenant architecture with org-level isolation at database layer.", status: "Skip" },
];

export type TrainingStatus = "On track" | "At risk" | "Complete" | "Overdue";

export const trainingModules = [
  {
    id: "mod-sec",
    name: "Security awareness",
    description: "Annual security training covering phishing, passwords, and incident reporting.",
    completed: 5,
    total: 6,
    due: "2025-06-01",
    duration: "45 min",
    status: "On track" as TrainingStatus,
    framework: "SOC 2 CC1.4",
  },
  {
    id: "mod-hipaa",
    name: "HIPAA basics",
    description: "PHI handling, minimum necessary rule, and breach notification for healthcare customers.",
    completed: 3,
    total: 6,
    due: "2025-06-15",
    duration: "60 min",
    status: "At risk" as TrainingStatus,
    framework: "HIPAA §164.530",
  },
  {
    id: "mod-phish",
    name: "Phishing simulation",
    description: "Interactive phishing scenarios with click-rate tracking and remedial micro-learning.",
    completed: 6,
    total: 6,
    due: "Complete",
    duration: "20 min",
    status: "Complete" as TrainingStatus,
    framework: "SOC 2 CC1.4",
  },
  {
    id: "mod-iso",
    name: "ISO 27001 fundamentals",
    description: "ISMS scope, risk treatment, and control ownership for teams pursuing ISO certification.",
    completed: 2,
    total: 6,
    due: "2025-07-01",
    duration: "90 min",
    status: "On track" as TrainingStatus,
    framework: "ISO 27001 A.7",
  },
  {
    id: "mod-secrets",
    name: "Secrets & credentials hygiene",
    description: "Never commit secrets, use vaults, and rotate keys—aligned with current gap remediation.",
    completed: 4,
    total: 6,
    due: "2025-05-28",
    duration: "30 min",
    status: "At risk" as TrainingStatus,
    framework: "SOC 2 CC6.1",
  },
];

export const trainingMemberProgress = [
  { memberId: "tm-1", name: "Sarah Chen", completed: 5, total: 5, overdue: 0 },
  { memberId: "tm-2", name: "Marcus Webb", completed: 4, total: 5, overdue: 1 },
  { memberId: "tm-3", name: "Priya Patel", completed: 5, total: 5, overdue: 0 },
  { memberId: "tm-4", name: "Alex Kim", completed: 5, total: 5, overdue: 0 },
  { memberId: "tm-5", name: "Jordan Lee", completed: 3, total: 5, overdue: 0 },
  { memberId: "tm-6", name: "Taylor Brooks", completed: 1, total: 5, overdue: 3 },
];
