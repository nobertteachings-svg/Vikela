import type { DashboardStats } from "@vikela/shared";
import { serverApiGet } from "./server-api";

export type GapRow = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  filePath: string | null;
  lineNumber: number | null;
  remediation: string;
  controlCode?: string | null;
  controlTitle?: string | null;
  repoName?: string | null;
  isSample?: boolean;
  createdAt: string;
  resolvedAt?: string | null;
};

export type FrameworkRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  version: string | null;
  controlCount: number;
  score: number;
  enrolled: boolean;
  status: string;
};

export type ControlFrameworkRef = {
  slug: string;
  name: string;
};

export type ControlRow = {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  guidance: string | null;
  status: string;
  frameworks: ControlFrameworkRef[];
  evidenceCount: number;
  openGapCount: number;
  updatedAt: string | null;
};

export type ScanRow = {
  id: string;
  scanType: string;
  status: string;
  score: number | null;
  target: string | null;
  branch: string | null;
  prNumber: number | null;
  gapsFound: number;
  isLiteScan?: boolean;
  parentScanId?: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type EvidenceRow = {
  id: string;
  title: string;
  type: string;
  controlCode?: string | null;
  collectedAt: string;
  source: string;
  isAutoCollected?: boolean;
};

export type EvidenceCoverage = {
  totalControls: number;
  controlsWithEvidence: number;
  coveragePercent: number;
  controls: Array<{
    orgControlId: string;
    controlCode: string;
    controlTitle: string;
    category: string;
    controlStatus: string;
    evidenceCount: number;
    hasEvidence: boolean;
  }>;
};

export type PolicyListItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  preview: string;
  updatedAt: string;
};

export type PolicyDetail = PolicyListItem & { content: string };

export type VendorRow = {
  id: string;
  name: string;
  website?: string | null;
  category: string;
  riskLevel: string;
  risk?: string;
  reviewStatus: string;
  status?: string;
  lastReviewed: string | null;
  notes: string | null;
  owner?: string | null;
  dataAccess?: string | null;
  contractRenewal?: string | null;
  score?: number | null;
  questionnaire?: string | null;
  questionnaireStatus?: string | null;
  questionnaireId?: string | null;
  documents?: string[];
  subprocessors?: string[];
  dataProcessing?: boolean;
  soc2?: boolean;
  soc2Certified?: boolean;
};

export type SettingsData = {
  settings: {
    notifications: Record<string, boolean>;
    security: {
      mfaRequired: boolean;
      ssoEnforced: boolean;
      ipAllowlist: string[];
    };
    trust?: {
      published: boolean;
      showScores: boolean;
      tagline: string;
    };
  };
  apiKeys: Array<{
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  webhooks: Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: string;
  }>;
};

export type TrainingAssignmentRow = {
  id: string;
  moduleId: string;
  moduleName?: string;
  status: string;
  completedAt: string | null;
  due?: string | null;
};

export type TrainingProgressRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  completed: number;
  total: number;
  overdue: number;
  inProgress: number;
  progress: number;
  status: string;
  assignments?: TrainingAssignmentRow[];
};

export type TrainingProgressResponse = {
  currentMemberId: string | null;
  members: TrainingProgressRow[];
};

export type TrainingMineResponse = {
  memberId: string | null;
  assignments: Array<{
    id: string;
    status: string;
    completedAt: string | null;
    module: {
      id: string;
      name: string;
      description: string;
      framework: string | null;
      contentKey?: string | null;
      hasCourse?: boolean;
      lessonCount?: number;
      duration: string;
      due: string | null;
    };
  }>;
};

export type RiskRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  score: number;
  status: string;
  mitigation: string | null;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  clerkId?: string;
  createdAt: string;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  connectedIntegrations: number;
  openGaps: number;
  memberCount: number;
};

export type IntegrationsResponse = {
  providers: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    connected: boolean;
    integrationId?: string;
    resourceCount?: number;
    lastSyncedAt?: string;
    connectable?: boolean;
    unavailableReason?: "coming_soon" | "not_configured" | null;
    awsPlatformReady?: boolean;
  }>;
  connectedCount: number;
};

const NO_STORE = { cache: "no-store" as const };

export const complianceApi = {
  dashboard: () => serverApiGet<DashboardStats>("/api/v1/dashboard", NO_STORE),

  /** Aggregates all dashboard slices from the API (no mock data). */
  dashboardPage: async () => {
    const [stats, frameworks, gaps, org, evidenceCoverage] = await Promise.all([
      serverApiGet<DashboardStats>("/api/v1/dashboard", NO_STORE),
      serverApiGet<FrameworkRow[]>("/api/v1/frameworks", NO_STORE),
      serverApiGet<GapRow[]>("/api/v1/gaps?status=OPEN", NO_STORE),
      serverApiGet<OrgInfo>("/api/v1/org", NO_STORE),
      serverApiGet<EvidenceCoverage>("/api/v1/evidence/coverage", NO_STORE),
    ]);
    return { stats, frameworks, gaps, org, evidenceCoverage };
  },
  org: () => serverApiGet<OrgInfo>("/api/v1/org"),
  trust: () =>
    serverApiGet<{
      name: string;
      slug: string;
      tagline: string | null;
      updatedAt: string;
      shareUrl: string;
      frameworks: Array<{ id: string; name: string; slug?: string; score?: number }>;
      policies: Array<{ id: string; title: string }>;
      settings: { published: boolean; showScores: boolean; tagline: string };
      recentRequests: unknown[];
    }>("/api/v1/trust", NO_STORE),
  settings: () => serverApiGet<SettingsData>("/api/v1/settings", NO_STORE),
  frameworks: () => serverApiGet<FrameworkRow[]>("/api/v1/frameworks"),
  controls: (params?: { framework?: string; status?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.framework) q.set("framework", params.framework);
    if (params?.status) q.set("status", params.status);
    if (params?.category) q.set("category", params.category);
    const qs = q.toString();
    return serverApiGet<ControlRow[]>(`/api/v1/controls${qs ? `?${qs}` : ""}`, NO_STORE);
  },

  controlsPage: async () => {
    const [controls, frameworks, org] = await Promise.all([
      serverApiGet<ControlRow[]>("/api/v1/controls", NO_STORE),
      serverApiGet<FrameworkRow[]>("/api/v1/frameworks", NO_STORE),
      serverApiGet<OrgInfo>("/api/v1/org", NO_STORE),
    ]);
    return { controls, frameworks, org };
  },
  control: (code: string) =>
    serverApiGet<Record<string, unknown>>(`/api/v1/controls/${encodeURIComponent(code)}`, NO_STORE),
  gaps: (params?: {
    severity?: string;
    status?: string;
    source?: string;
    framework?: string;
    control?: string;
    scanId?: string;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.severity) q.set("severity", params.severity);
    if (params?.status) q.set("status", params.status);
    if (params?.source) q.set("source", params.source);
    if (params?.framework) q.set("framework", params.framework);
    if (params?.control) q.set("control", params.control);
    if (params?.scanId) q.set("scanId", params.scanId);
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return serverApiGet<GapRow[]>(`/api/v1/gaps${qs ? `?${qs}` : ""}`);
  },
  gap: (id: string) => serverApiGet<GapRow>(`/api/v1/gaps/${id}`),
  scans: () => serverApiGet<ScanRow[]>("/api/v1/scans"),
  evidence: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return serverApiGet<EvidenceRow[]>(`/api/v1/evidence${qs ? `?${qs}` : ""}`);
  },
  evidenceCoverage: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return serverApiGet<EvidenceCoverage>(`/api/v1/evidence/coverage${qs ? `?${qs}` : ""}`);
  },
  policies: () => serverApiGet<PolicyListItem[]>("/api/v1/policies"),
  policy: (id: string) => serverApiGet<PolicyDetail>(`/api/v1/policies/${id}`),
  vendors: () => serverApiGet<VendorRow[]>("/api/v1/vendors"),
  vendor: (id: string) => serverApiGet<VendorRow>(`/api/v1/vendors/${id}`),
  risks: () => serverApiGet<RiskRow[]>("/api/v1/risks"),
  members: () => serverApiGet<MemberRow[]>("/api/v1/members"),
  memberInvites: () => serverApiGet<PendingInviteRow[]>("/api/v1/members/invites"),
  training: () =>
    serverApiGet<
      Array<{
        id: string;
        name: string;
        description: string;
        framework: string | null;
        completed: number;
        total: number;
        due: string | null;
        duration: string;
        durationMin?: number;
        contentKey?: string | null;
        hasCourse?: boolean;
        lessonCount?: number;
        status: string;
      }>
    >("/api/v1/training", NO_STORE),
  trainingProgress: () =>
    serverApiGet<TrainingProgressResponse>("/api/v1/training/progress", NO_STORE),
  trainingMine: () =>
    serverApiGet<TrainingMineResponse>("/api/v1/training/mine", NO_STORE),
  questionnaires: (vendorId?: string) =>
    serverApiGet<
      Array<{
        id: string;
        title: string;
        status: string;
        vendorId?: string | null;
        itemCount: number;
        approvedCount?: number;
        progressPercent?: number;
        createdAt?: string;
        updatedAt?: string;
        items: Array<{
          id: string;
          q: string;
          category?: string;
          suggestedAnswer?: string;
          answer: string;
          status: string;
          sortOrder?: number;
        }>;
      }>
    >(
      vendorId
        ? `/api/v1/questionnaires?vendorId=${encodeURIComponent(vendorId)}`
        : "/api/v1/questionnaires",
      NO_STORE
    ),
  billing: () =>
    serverApiGet<{
      orgName: string;
      plan: string;
      planLabel: string;
      status: string;
      seats: { used: number; limit: number };
      billingCycle: string;
      renewalDate: string | null;
      nextInvoiceDate: string | null;
      renewalAmountCents: number | null;
      billingEmail: string | null;
      paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
      stripeConfigured: boolean;
      stripeCustomerId?: string | null;
      hasStripeSubscription?: boolean;
      features?: {
        frameworkDashboards: boolean;
        copilot: boolean;
        policyGenerator: boolean;
        evidenceExports: boolean;
        questionnaires: boolean;
      };
      usage: {
        integrations: { used: number; limit: number };
        scans: { used: number; limit: number };
        evidence: { used: number; limit: number | null };
        storageMb: { used: number; limit: number };
        openGaps: number;
      };
      invoices: Array<{
        id: string;
        date: string;
        amount: string;
        status: string;
        pdfUrl: string | null;
      }>;
    }>("/api/v1/billing", NO_STORE),
  integrations: () => serverApiGet<IntegrationsResponse>("/api/v1/integrations"),
  auditEvents: () =>
    serverApiGet<{
      events: Array<{
        id: string;
        action: string;
        target: string | null;
        metadata: unknown;
        createdAt: string;
        actor: { id: string; name: string | null; email: string | null } | null;
      }>;
    }>("/api/v1/audit-events", NO_STORE),
  repositories: () =>
    serverApiGet<Array<{ id: string; fullName: string; defaultBranch: string; lastScannedAt: string | null }>>(
      "/api/v1/repositories"
    ),
};
