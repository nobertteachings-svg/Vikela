const FROM = process.env.RESEND_FROM_EMAIL ?? "Vikela <onboarding@vikela.com>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, error: text };
  }

  const json = (await res.json()) as { id?: string };
  return { sent: true, id: json.id };
}

export async function sendScanCompleteEmail(params: {
  to: string;
  orgName: string;
  scanType: string;
  score: number | null;
  gapCount: number;
  scansUrl: string;
}) {
  const scoreLabel = params.score ?? "—";
  return sendEmail({
    to: params.to,
    subject: `Scan complete — ${scoreLabel} posture score`,
    html: `
      <p>A <strong>${params.scanType}</strong> finished for <strong>${params.orgName}</strong>.</p>
      <ul>
        <li>Posture score: <strong>${scoreLabel}</strong></li>
        <li>Gaps found this scan: <strong>${params.gapCount}</strong></li>
      </ul>
      <p><a href="${params.scansUrl}">View scans in Vikela</a></p>
      <p style="color:#666;font-size:12px">Vikela — Universal Compliance Engine</p>
    `,
  });
}

export async function sendGapAlertsEmail(params: {
  to: string;
  orgName: string;
  totalCount: number;
  criticalCount: number;
  highCount: number;
  findings: Array<{ title: string; severity: string }>;
  gapsUrl: string;
}) {
  const breakdown = [
    params.criticalCount > 0 ? `${params.criticalCount} critical` : null,
    params.highCount > 0 ? `${params.highCount} high` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const findingsHtml = params.findings
    .map(
      (g) =>
        `<li><strong>${g.severity}</strong> — ${escapeHtml(g.title)}</li>`
    )
    .join("");

  return sendEmail({
    to: params.to,
    subject: `${params.totalCount} critical/high gaps found`,
    html: `
      <p>New compliance gaps were detected in <strong>${params.orgName}</strong>.</p>
      <p><strong>${params.totalCount}</strong> critical/high finding${params.totalCount === 1 ? "" : "s"} (${breakdown}).</p>
      <ul>${findingsHtml}</ul>
      <p><a href="${params.gapsUrl}">Review gaps in Vikela</a></p>
      <p style="color:#666;font-size:12px">Vikela — Universal Compliance Engine</p>
    `,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMemberInviteEmail(params: {
  to: string;
  orgName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `You've been invited to ${params.orgName} on Vikela`,
    html: `
      <p>${params.inviterName} invited you to join <strong>${params.orgName}</strong> on Vikela.</p>
      <p><a href="${params.inviteUrl}">Accept invitation</a></p>
      <p style="color:#666;font-size:12px">Vikela — Universal Compliance Engine</p>
    `,
  });
}

export async function sendCriticalGapAlert(params: {
  to: string;
  orgName: string;
  gapTitle: string;
  severity: string;
  dashboardUrl: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `[${params.severity}] New compliance gap — ${params.orgName}`,
    html: `
      <p>A <strong>${params.severity}</strong> gap was detected in <strong>${params.orgName}</strong>:</p>
      <p>${params.gapTitle}</p>
      <p><a href="${params.dashboardUrl}">View in Vikela</a></p>
    `,
  });
}

export async function sendTrainingReminderEmail(params: {
  to: string;
  name: string;
  orgName: string;
  modules: string[];
  trainingUrl: string;
}) {
  const list = params.modules
    .map((m) => `<li>${escapeHtml(m)}</li>`)
    .join("");
  return sendEmail({
    to: params.to,
    subject: `Training reminder — ${params.orgName}`,
    html: `
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>You have overdue security training for <strong>${escapeHtml(params.orgName)}</strong>:</p>
      <ul>${list}</ul>
      <p><a href="${params.trainingUrl}">Complete training in Vikela</a></p>
      <p style="color:#666;font-size:12px">Vikela — Universal Compliance Engine</p>
    `,
  });
}
