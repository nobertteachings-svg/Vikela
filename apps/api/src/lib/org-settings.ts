export type OrgSettings = {
  notifications: {
    gapAlerts: boolean;
    scanComplete: boolean;
    /** Reserved / unused until weekly digest email is enforced. */
    weeklyDigest: boolean;
    memberInvites: boolean;
  };
  security: {
    /** Reserved / unused until Shieldoq enforces MFA beyond Clerk. */
    mfaRequired: boolean;
    /** Reserved / unused until Shieldoq enforces SSO beyond Clerk. */
    ssoEnforced: boolean;
    ipAllowlist: string[];
  };
  /** Customer-facing trust center at /trust/{slug} */
  trust: {
    /** When false, public URL returns 404. */
    published: boolean;
    /** When false, framework readiness scores are hidden on the visitor page. */
    showScores: boolean;
    /** Optional one-line intro under the org name. */
    tagline: string;
  };
};

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  notifications: {
    gapAlerts: true,
    scanComplete: true,
    weeklyDigest: true,
    memberInvites: true,
  },
  security: {
    mfaRequired: false,
    ssoEnforced: false,
    ipAllowlist: [],
  },
  trust: {
    published: false,
    showScores: false,
    tagline: "",
  },
};

export function parseOrgSettings(raw: unknown): OrgSettings {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_ORG_SETTINGS);
  const s = raw as Record<string, unknown>;
  const notificationsIn =
    s.notifications && typeof s.notifications === "object" && !Array.isArray(s.notifications)
      ? (s.notifications as Record<string, unknown>)
      : {};
  const securityIn =
    s.security && typeof s.security === "object" && !Array.isArray(s.security)
      ? (s.security as Record<string, unknown>)
      : {};
  const trustIn =
    s.trust && typeof s.trust === "object" && !Array.isArray(s.trust)
      ? (s.trust as Record<string, unknown>)
      : {};
  return {
    notifications: {
      gapAlerts: Boolean(
        notificationsIn.gapAlerts ?? DEFAULT_ORG_SETTINGS.notifications.gapAlerts
      ),
      scanComplete: Boolean(
        notificationsIn.scanComplete ?? DEFAULT_ORG_SETTINGS.notifications.scanComplete
      ),
      weeklyDigest: Boolean(
        notificationsIn.weeklyDigest ?? DEFAULT_ORG_SETTINGS.notifications.weeklyDigest
      ),
      memberInvites: Boolean(
        notificationsIn.memberInvites ?? DEFAULT_ORG_SETTINGS.notifications.memberInvites
      ),
    },
    security: {
      mfaRequired: Boolean(
        securityIn.mfaRequired ?? DEFAULT_ORG_SETTINGS.security.mfaRequired
      ),
      ssoEnforced: Boolean(
        securityIn.ssoEnforced ?? DEFAULT_ORG_SETTINGS.security.ssoEnforced
      ),
      ipAllowlist: Array.isArray(securityIn.ipAllowlist)
        ? securityIn.ipAllowlist.filter((entry): entry is string => typeof entry === "string")
        : [...DEFAULT_ORG_SETTINGS.security.ipAllowlist],
    },
    trust: {
      published: Boolean(trustIn.published ?? DEFAULT_ORG_SETTINGS.trust.published),
      showScores: Boolean(trustIn.showScores ?? DEFAULT_ORG_SETTINGS.trust.showScores),
      tagline:
        typeof trustIn.tagline === "string"
          ? trustIn.tagline.slice(0, 280)
          : DEFAULT_ORG_SETTINGS.trust.tagline,
    },
  };
}

/** Merge parsed settings into raw org.settings without dropping unrelated keys (e.g. trustReportRequests). */
export function mergeOrgSettingsJson(
  raw: unknown,
  next: OrgSettings
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  return {
    ...base,
    notifications: next.notifications,
    security: next.security,
    trust: next.trust,
  };
}
