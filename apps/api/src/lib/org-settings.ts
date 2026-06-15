export type OrgSettings = {
  notifications: {
    gapAlerts: boolean;
    scanComplete: boolean;
    weeklyDigest: boolean;
    memberInvites: boolean;
  };
  security: {
    mfaRequired: boolean;
    ssoEnforced: boolean;
    ipAllowlist: string[];
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
};

export function parseOrgSettings(raw: unknown): OrgSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ORG_SETTINGS };
  const s = raw as Partial<OrgSettings>;
  return {
    notifications: { ...DEFAULT_ORG_SETTINGS.notifications, ...s.notifications },
    security: {
      ...DEFAULT_ORG_SETTINGS.security,
      ...s.security,
      ipAllowlist: Array.isArray(s.security?.ipAllowlist)
        ? s.security.ipAllowlist.filter((entry): entry is string => typeof entry === "string")
        : DEFAULT_ORG_SETTINGS.security.ipAllowlist,
    },
  };
}
