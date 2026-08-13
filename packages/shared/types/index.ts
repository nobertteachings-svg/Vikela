// Shared types across Vikela apps

export * from "./providers.js";

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
};

export type Plan = "FREE" | "SOLO" | "STARTER" | "GROWTH" | "ENTERPRISE";
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "AUDITOR";
export type FrameworkStatus = "NOT_STARTED" | "IN_PROGRESS" | "READY" | "CERTIFIED";
export type ControlStatus = "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "NEEDS_REVIEW";
export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type ScanType = "CODE" | "CLOUD" | "IDENTITY" | "FULL";
export type GapStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type GapSource = "CODE" | "IAM" | "NETWORK" | "ENCRYPTION" | "LOGGING" | "BACKUP" | "MONITORING";
export type CloudProvider =
  | "AWS"
  | "AZURE"
  | "GCP"
  | "DIGITALOCEAN"
  | "CLOUDFLARE"
  | "ORACLE"
  | "ALIBABA";
export type EvidenceType =
  | "SCREENSHOT"
  | "LOG"
  | "EXPORT"
  | "POLICY"
  | "CONFIG"
  | "CERTIFICATE"
  | "OTHER";
export type PolicyType =
  | "ACCESS_CONTROL"
  | "INCIDENT_RESPONSE"
  | "CHANGE_MANAGEMENT"
  | "DATA_RETENTION"
  | "VENDOR_MANAGEMENT"
  | "ACCEPTABLE_USE"
  | "DISASTER_RECOVERY"
  | "AI_GOVERNANCE";
export type PolicyStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ReviewStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type RiskStatus = "OPEN" | "MITIGATED" | "ACCEPTED" | "CLOSED";

export interface FrameworkSummary {
  id: string;
  name: string;
  slug: string;
  score: number;
  status: FrameworkStatus;
  controlsTotal: number;
  controlsImplemented: number;
}

export interface GapSummary {
  id: string;
  title: string;
  severity: Severity;
  status: GapStatus;
  source: GapSource;
  filePath?: string | null;
  lineNumber?: number | null;
  controlCode?: string | null;
  cloudProvider?: CloudProvider | null;
  resourceType?: string | null;
  resourceId?: string | null;
  region?: string | null;
  isSample?: boolean;
  createdAt: string;
}

export interface CloudAccountSummary {
  id: string;
  provider: CloudProvider;
  accountName: string;
  accountId: string;
  gapCount: number;
  lastScannedAt?: string | null;
}

export interface DashboardRecentScan {
  id: string;
  scanType: ScanType;
  status: ScanStatus;
  score: number | null;
  target: string | null;
  gapsFound: number;
  completedAt: string | null;
}

export interface DashboardStats {
  postureScore: number;
  frameworks: FrameworkSummary[];
  criticalGaps: GapSummary[];
  scoreTrend: { date: string; score: number }[];
  gapsBySeverity: Record<Severity, number>;
  gapsBySource: Record<GapSource, number>;
  cloudAccounts: CloudAccountSummary[];
  connectedIntegrations: number;
  controlsTotal: number;
  controlsImplemented: number;
  recentScans: DashboardRecentScan[];
  /** Latest lite onboarding scan used sample findings. */
  hasSampleGaps?: boolean;
  liteScanSource?: "repo" | "sample" | "mixed" | null;
}

export interface ControlRow {
  id: string;
  code: string;
  title: string;
  category: string;
  status: ControlStatus;
  frameworks: string[];
  ownerName?: string | null;
}

export interface ScanFinding {
  title: string;
  description: string;
  severity: Severity;
  source: GapSource;
  filePath?: string;
  lineNumber?: number;
  codeSnippet?: string;
  cloudProvider?: CloudProvider;
  resourceType?: string;
  resourceId?: string;
  region?: string;
  remediation: string;
  controlCode?: string;
}
