const FROM = process.env.RESEND_FROM_EMAIL ?? "Shieldoq <hello@shieldoq.com>";
const APP_URL = (process.env.APP_URL ?? "https://www.shieldoq.com").replace(/\/$/, "");
const LOGO_URL = `${APP_URL}/brand/shieldoq-logo.png`;
const SITE_URL = APP_URL;
const SUPPORT_EMAIL = "support@shieldoq.com";
const HELLO_EMAIL = "hello@shieldoq.com";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** When true, `html` is already a full document and will not be wrapped. */
  raw?: boolean;
}): Promise<{ sent: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const html = params.raw ? params.html : wrapEmailHtml(params.html);

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
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, error: text };
  }

  const json = (await res.json()) as { id?: string };
  return { sent: true, id: json.id };
}

/** Professional branded shell for transactional email (table + inline CSS). */
export function wrapEmailHtml(bodyHtml: string, opts?: { preheader?: string }): string {
  const preheader = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shieldoq</title>
</head>
<body style="margin:0;padding:0;background-color:#141413;font-family:'DM Sans',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141413;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#1c1c1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="Shieldoq" width="168" height="48" style="display:block;width:168px;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;color:#f5f5f4;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.08);background-color:#181816;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#a8a29e;">
                <strong style="color:#f5f5f4;">Shieldoq</strong><br />
                Universal Compliance Engine
              </p>
              <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#78716c;">
                Map code, cloud, and identity into the frameworks buyers ask for.
              </p>
              <p style="margin:0 0 4px;font-size:12px;line-height:1.5;">
                <a href="${SITE_URL}" style="color:#2dd4bf;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
                &nbsp;·&nbsp;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#2dd4bf;text-decoration:none;">${SUPPORT_EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="mailto:${HELLO_EMAIL}" style="color:#2dd4bf;text-decoration:none;">${HELLO_EMAIL}</a>
              </p>
              <p style="margin:16px 0 0;font-size:11px;line-height:1.4;color:#57534e;">
                You received this email because of activity in your Shieldoq workspace.
                Questions? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#78716c;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr>
    <td style="border-radius:6px;background-color:#0f766e;">
      <a href="${href}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ccfbf1;text-decoration:none;border-radius:6px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
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
    subject: `Scan complete: ${scoreLabel} posture score`,
    html: `
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2dd4bf;">Scan complete</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">Your ${escapeHtml(params.scanType)} finished</h1>
      <p style="margin:0 0 16px;color:#a8a29e;">Results for <strong style="color:#f5f5f4;">${escapeHtml(params.orgName)}</strong> are ready.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#141413;border:1px solid rgba(255,255,255,0.08);border-radius:8px;">
        <tr>
          <td style="padding:16px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#78716c;font-size:12px;">Posture score</span><br />
            <strong style="font-size:20px;color:#faf9f5;">${scoreLabel}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 18px;">
            <span style="color:#78716c;font-size:12px;">Gaps found this scan</span><br />
            <strong style="font-size:20px;color:#faf9f5;">${params.gapCount}</strong>
          </td>
        </tr>
      </table>
      ${ctaButton(params.scansUrl, "View scans in Shieldoq")}
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
        `<li style="margin:0 0 8px;color:#a8a29e;"><strong style="color:#f5f5f4;">${escapeHtml(g.severity)}</strong>: ${escapeHtml(g.title)}</li>`
    )
    .join("");

  return sendEmail({
    to: params.to,
    subject: `${params.totalCount} critical/high gaps found`,
    html: `
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ef4444;">Gap alert</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">New compliance gaps detected</h1>
      <p style="margin:0 0 16px;color:#a8a29e;">
        <strong style="color:#f5f5f4;">${params.totalCount}</strong> critical/high finding${params.totalCount === 1 ? "" : "s"}
        in <strong style="color:#f5f5f4;">${escapeHtml(params.orgName)}</strong>${breakdown ? ` (${escapeHtml(breakdown)})` : ""}.
      </p>
      <ul style="margin:0 0 8px;padding-left:18px;">${findingsHtml}</ul>
      ${ctaButton(params.gapsUrl, "Review gaps in Shieldoq")}
    `,
  });
}

export function escapeHtml(value: string): string {
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
    subject: `You've been invited to ${params.orgName} on Shieldoq`,
    html: `
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2dd4bf;">Invitation</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">Join ${escapeHtml(params.orgName)} on Shieldoq</h1>
      <p style="margin:0 0 16px;color:#a8a29e;">
        <strong style="color:#f5f5f4;">${escapeHtml(params.inviterName)}</strong> invited you to their compliance workspace.
      </p>
      ${ctaButton(params.inviteUrl, "Accept invitation")}
      <p style="margin:16px 0 0;font-size:12px;color:#78716c;">If the button does not work, copy this link:<br /><a href="${params.inviteUrl}" style="color:#2dd4bf;word-break:break-all;">${params.inviteUrl}</a></p>
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
    subject: `[${params.severity}] New compliance gap, ${params.orgName}`,
    html: `
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ef4444;">${escapeHtml(params.severity)} gap</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">New compliance gap detected</h1>
      <p style="margin:0 0 12px;color:#a8a29e;">Workspace: <strong style="color:#f5f5f4;">${escapeHtml(params.orgName)}</strong></p>
      <p style="margin:0 0 8px;padding:14px 16px;background:#141413;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#f5f5f4;">${escapeHtml(params.gapTitle)}</p>
      ${ctaButton(params.dashboardUrl, "View in Shieldoq")}
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
    .map((m) => `<li style="margin:0 0 8px;color:#a8a29e;">${escapeHtml(m)}</li>`)
    .join("");
  return sendEmail({
    to: params.to,
    subject: `Training reminder, ${params.orgName}`,
    html: `
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#2dd4bf;">Training</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#faf9f5;">Security training reminder</h1>
      <p style="margin:0 0 16px;color:#a8a29e;">Hi ${escapeHtml(params.name)},</p>
      <p style="margin:0 0 16px;color:#a8a29e;">You have overdue training for <strong style="color:#f5f5f4;">${escapeHtml(params.orgName)}</strong>:</p>
      <ul style="margin:0 0 8px;padding-left:18px;">${list}</ul>
      ${ctaButton(params.trainingUrl, "Complete training")}
    `,
  });
}
