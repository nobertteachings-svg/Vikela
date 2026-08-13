import type { Severity } from "@prisma/client";
import { prisma } from "./prisma.js";
import { sendGapAlertsEmail, sendScanCompleteEmail } from "./email.js";
import { getAdminEmails, notificationPrefsFromOrgSettings } from "./notify-helpers.js";
import { deliverChannelAlerts } from "./notify-channel-alerts.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const ALERT_SEVERITIES: Severity[] = ["CRITICAL", "HIGH"];

export type ScanEmailContext = {
  scanId: string;
  scanType: string;
  score: number | null;
  gapCount?: number;
  isLiteScan?: boolean;
};

export type NotifyScanEmailsOptions = {
  /** Full-scan parent rows have no gap rows, gap alerts run on sub-scans only. */
  includeGapAlerts?: boolean;
};

export function notifyScanEmails(
  orgId: string,
  scan: ScanEmailContext,
  options?: NotifyScanEmailsOptions
): void {
  void deliverScanNotifications(orgId, scan, options).catch((err) => {
    console.warn("[notify-scan-emails] failed", { orgId, scanId: scan.scanId, err });
  });
}

async function deliverScanNotifications(
  orgId: string,
  scan: ScanEmailContext,
  options?: NotifyScanEmailsOptions
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, settings: true },
  });
  if (!org) return;

  const prefs = notificationPrefsFromOrgSettings(org.settings);
  const includeGapAlerts = options?.includeGapAlerts !== false;
  const sendComplete = prefs.scanComplete;
  const sendAlerts = includeGapAlerts && prefs.gapAlerts;

  if (!sendComplete && !sendAlerts) return;

  let alertGaps: Array<{ title: string; severity: Severity }> = [];
  let totalMatching = 0;
  let criticalCount = 0;
  let highCount = 0;

  if (sendAlerts) {
    const gapWhere = {
      orgId,
      scanId: scan.scanId,
      isSample: false,
      severity: { in: ALERT_SEVERITIES },
    };

    [totalMatching, criticalCount, highCount, alertGaps] = await Promise.all([
      prisma.gap.count({ where: gapWhere }),
      prisma.gap.count({ where: { ...gapWhere, severity: "CRITICAL" } }),
      prisma.gap.count({ where: { ...gapWhere, severity: "HIGH" } }),
      prisma.gap.findMany({
        where: gapWhere,
        select: { title: true, severity: true },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 10,
      }),
    ]);
  }

  const scanTypeLabel = formatScanType(scan.scanType, scan.isLiteScan);
  const scansUrl = `${APP_URL}/scans`;
  const gapsUrl = `${APP_URL}/gaps`;

  const adminEmails = await getAdminEmails(orgId);

  for (const to of adminEmails) {
    if (sendComplete) {
      const result = await sendScanCompleteEmail({
        to,
        orgName: org.name,
        scanType: scanTypeLabel,
        score: scan.score,
        gapCount: scan.gapCount ?? 0,
        scansUrl,
      });
      if (!result.sent) {
        console.warn("[notify-scan-emails] scan_complete_failed", {
          orgId,
          scanId: scan.scanId,
          to,
          error: result.error,
        });
      }
    }

    if (sendAlerts && alertGaps.length > 0) {
      const result = await sendGapAlertsEmail({
        to,
        orgName: org.name,
        totalCount: totalMatching,
        criticalCount,
        highCount,
        findings: alertGaps,
        gapsUrl,
      });
      if (!result.sent) {
        console.warn("[notify-scan-emails] gap_alerts_failed", {
          orgId,
          scanId: scan.scanId,
          to,
          error: result.error,
        });
      }
    }
  }

  if (sendComplete) {
    const scoreLabel = scan.score ?? "—";
    await deliverChannelAlerts(orgId, {
      kind: "scan_complete",
      orgName: org.name,
      text: `Vikela: ${scanTypeLabel} finished for ${org.name}. Score: ${scoreLabel}. Gaps this scan: ${scan.gapCount ?? 0}.`,
      scansUrl,
    });
  }

  if (sendAlerts && alertGaps.length > 0) {
    const top = alertGaps
      .slice(0, 5)
      .map((g) => `• [${g.severity}] ${g.title}`)
      .join("\n");
    await deliverChannelAlerts(orgId, {
      kind: "gap_alerts",
      orgName: org.name,
      text: `Vikela: ${totalMatching} critical/high gap(s) for ${org.name} (${criticalCount} critical, ${highCount} high).\n${top}`,
      gapsUrl,
    });
  }
}

function formatScanType(scanType: string, isLiteScan?: boolean): string {
  if (isLiteScan) return "Lite code scan";
  switch (scanType) {
    case "CODE":
      return "Code scan";
    case "CLOUD":
      return "Cloud scan";
    case "IDENTITY":
      return "Identity scan";
    case "FULL":
      return "Full scan";
    default:
      return scanType;
  }
}
