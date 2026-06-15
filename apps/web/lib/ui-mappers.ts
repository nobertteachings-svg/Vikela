import type { MemberRow, RiskRow, VendorRow } from "./compliance-api";

export type UiTeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member" | "Auditor";
  department: string;
  mfa: boolean;
  lastActive: string;
  joined: string;
};

export type UiVendor = {
  id: string;
  name: string;
  category: string;
  risk: string;
  lastReview: string;
  soc2: boolean;
  status: "Approved" | "Review needed" | "Not reviewed" | "Rejected";
  dataAccess: string;
  contractRenewal: string;
  owner: string;
};

export type UiRisk = {
  id: string;
  name: string;
  category: string;
  likelihood: string;
  impact: string;
  score: number;
  owner: string;
  mitigation: string;
  status: "Open" | "Mitigating" | "Accepted" | "Closed";
  matrix: { l: number; i: number };
  description: string;
  nextReview: string;
  controls: string[];
};

function mapRole(role: string): UiTeamMember["role"] {
  if (role === "OWNER" || role === "ADMIN") return "Admin";
  if (role === "AUDITOR") return "Auditor";
  return "Member";
}

export function mapMemberRow(m: MemberRow): UiTeamMember {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: mapRole(m.role),
    department: "—",
    mfa: true,
    lastActive: "Active",
    joined: m.createdAt,
  };
}

function mapReviewStatus(s: string): UiVendor["status"] {
  if (s === "APPROVED") return "Approved";
  if (s === "IN_REVIEW") return "Review needed";
  if (s === "REJECTED") return "Rejected";
  return "Not reviewed";
}

function mapRiskLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export function mapVendorRow(v: VendorRow): UiVendor {
  const status =
    v.status === "Approved" ||
    v.status === "Review needed" ||
    v.status === "Not reviewed" ||
    v.status === "Rejected"
      ? v.status
      : mapReviewStatus(v.reviewStatus);
  return {
    id: v.id,
    name: v.name,
    category: v.category,
    risk: v.risk ?? mapRiskLevel(v.riskLevel),
    lastReview: v.lastReviewed ? v.lastReviewed.slice(0, 10) : "—",
    soc2: v.soc2 ?? v.reviewStatus === "APPROVED",
    status,
    dataAccess: v.dataAccess ?? v.notes ?? "—",
    contractRenewal: v.contractRenewal?.slice(0, 10) ?? "—",
    owner: v.owner ?? "—",
  };
}

function mapRiskStatus(s: string): UiRisk["status"] {
  if (s === "MITIGATED") return "Mitigating";
  if (s === "ACCEPTED") return "Accepted";
  if (s === "CLOSED") return "Closed";
  return "Open";
}

function likelihoodLabel(n: number): string {
  if (n <= 1) return "Low";
  if (n === 2) return "Medium";
  return "High";
}

export function mapRiskRow(r: RiskRow): UiRisk {
  return {
    id: r.id,
    name: r.title,
    category: "Operational",
    likelihood: likelihoodLabel(r.likelihood),
    impact: likelihoodLabel(r.impact),
    score: r.score,
    owner: "—",
    mitigation: r.mitigation ?? "",
    status: mapRiskStatus(r.status),
    matrix: { l: r.likelihood, i: r.impact },
    description: r.description,
    nextReview: r.updatedAt.slice(0, 10),
    controls: [],
  };
}
