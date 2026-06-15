import { prisma } from "./prisma.js";
import { ADMIN_ROLES } from "./authorization.js";

export async function getAdminEmails(orgId: string): Promise<string[]> {
  const admins = await prisma.member.findMany({
    where: { orgId, role: { in: ADMIN_ROLES } },
    select: { email: true },
  });
  return [...new Set(admins.map((m) => m.email.trim()).filter(Boolean))];
}

export type NotificationPrefs = {
  scanComplete: boolean;
  gapAlerts: boolean;
};

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  scanComplete: true,
  gapAlerts: true,
};

export function notificationPrefsFromOrgSettings(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFS };
  const settings = raw as { notifications?: Partial<NotificationPrefs> };
  return {
    scanComplete: settings.notifications?.scanComplete ?? DEFAULT_NOTIFICATION_PREFS.scanComplete,
    gapAlerts: settings.notifications?.gapAlerts ?? DEFAULT_NOTIFICATION_PREFS.gapAlerts,
  };
}
