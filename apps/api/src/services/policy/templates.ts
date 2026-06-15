import type { PolicyType } from "@prisma/client";

export const POLICY_TITLES: Record<PolicyType, string> = {
  ACCESS_CONTROL: "Access Control Policy",
  INCIDENT_RESPONSE: "Incident Response Plan",
  CHANGE_MANAGEMENT: "Change Management Policy",
  DATA_RETENTION: "Data Retention & Disposal Policy",
  VENDOR_MANAGEMENT: "Vendor Management Policy",
  ACCEPTABLE_USE: "Acceptable Use Policy",
  DISASTER_RECOVERY: "Disaster Recovery & Business Continuity Plan",
  AI_GOVERNANCE: "AI Governance & Usage Policy",
};

export function policyTemplateOutline(type: PolicyType, orgName: string): string {
  const base = `Organization: ${orgName}\nPolicy type: ${POLICY_TITLES[type]}\n\n`;
  const sections: Record<PolicyType, string[]> = {
    ACCESS_CONTROL: [
      "Purpose and scope",
      "Roles and responsibilities",
      "User provisioning and deprovisioning",
      "Authentication (MFA, SSO)",
      "Privileged access",
      "Access reviews",
      "Violation handling",
    ],
    INCIDENT_RESPONSE: [
      "Purpose",
      "Incident classification",
      "Roles and escalation",
      "Detection and reporting",
      "Containment and eradication",
      "Recovery and post-incident review",
      "Communication",
    ],
    CHANGE_MANAGEMENT: [
      "Purpose",
      "Change categories",
      "Approval workflow",
      "Testing requirements",
      "Emergency changes",
      "Documentation and rollback",
    ],
    DATA_RETENTION: [
      "Purpose",
      "Data classification",
      "Retention schedules",
      "Secure disposal",
      "Customer data requests",
    ],
    VENDOR_MANAGEMENT: [
      "Purpose",
      "Vendor inventory",
      "Risk assessment",
      "Contract security requirements",
      "Ongoing monitoring",
    ],
    ACCEPTABLE_USE: [
      "Purpose",
      "Permitted use",
      "Prohibited activities",
      "Device and network use",
      "Enforcement",
    ],
    DISASTER_RECOVERY: [
      "Purpose",
      "RTO/RPO objectives",
      "Backup strategy",
      "Failover procedures",
      "Testing schedule",
    ],
    AI_GOVERNANCE: [
      "Purpose",
      "Approved AI tools",
      "Data handling with AI",
      "Human review requirements",
      "Prohibited uses",
    ],
  };

  return (
    base +
    "Required sections:\n" +
    sections[type].map((s, i) => `${i + 1}. ${s}`).join("\n")
  );
}
