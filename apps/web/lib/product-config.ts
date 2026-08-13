/** Production UI structure, nav, settings tabs, roles, status labels. */

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/frameworks", label: "Frameworks", icon: "frameworks" },
  { href: "/controls", label: "Controls", icon: "controls" },
  { href: "/gaps", label: "Gaps & findings", icon: "gaps" },
  { href: "/remediation", label: "Gap remediation", icon: "remediation" },
  { href: "/scans", label: "Scan history", icon: "scans" },
  { href: "/evidence", label: "Evidence", icon: "evidence" },
  { href: "/policies", label: "Policies", icon: "policies" },
  { href: "/copilot", label: "Copilot", icon: "copilot" },
  { divider: true },
  { href: "/risks", label: "Risk register", icon: "risks" },
  { href: "/vendors", label: "Vendors", icon: "vendors" },
  { href: "/questionnaire", label: "Questionnaire", icon: "questionnaire" },
  { href: "/team", label: "Team & access", icon: "team" },
  { href: "/training", label: "Training", icon: "training" },
  { href: "/trust", label: "Trust center", icon: "trust" },
  { href: "/audit", label: "Audit trail", icon: "audit" },
  { divider: true },
  { href: "/integrations", label: "Integrations", icon: "integrations" },
  { href: "/help", label: "Help", icon: "help" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/billing", label: "Billing", icon: "billing" },
];

export const settingsTabs = [
  "General",
  "Notifications",
  "Security",
  "API Keys",
  "Webhooks",
  "Danger zone",
] as const;

export type SettingsTab = (typeof settingsTabs)[number];

export type TeamRole = "Admin" | "Member" | "Auditor";

export const teamRoles = [
  {
    name: "Admin" as TeamRole,
    desc: "Full access including billing, integrations, team management, and settings.",
    permissions: ["Manage org", "Billing", "Integrations", "Delete data"],
  },
  {
    name: "Member" as TeamRole,
    desc: "Manage gaps, evidence, policies, scans, and remediation workflows.",
    permissions: ["Gaps", "Evidence", "Policies", "Copilot"],
  },
  {
    name: "Auditor" as TeamRole,
    desc: "Read-only access for external auditors, no source code or secret values.",
    permissions: ["View controls", "Export evidence", "View gaps (redacted)"],
  },
];

export type RiskStatus = "Open" | "Mitigating" | "Accepted" | "Closed";

export const riskMatrixLabels = {
  likelihood: ["Low", "Medium", "High"],
  impact: ["Low", "Medium", "High"],
};

export type VendorStatus = "Approved" | "Review needed" | "Not reviewed" | "Rejected";
