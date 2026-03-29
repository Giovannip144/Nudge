// ══════════════════════════════════════════════════════════════
// NUDGE — Resend Email Delivery
// Sends the daily nudge email via Resend.
// ══════════════════════════════════════════════════════════════

import type { NudgeMessage, DigestMessage } from "./claude";

export interface SendNudgeEmailInput {
  to: string;
  userName: string;
  nudge: NudgeMessage;
  nudgeTime: string; // "HH:MM"
  logId?: string;   // nudge_logs.id — used for follow-up tracking buttons
}

// ─── Send the daily nudge email ──────────────────────────────
export async function sendNudgeEmail(input: SendNudgeEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const html = buildEmailHtml(input);
  const text = buildEmailText(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    "Nudge <onboarding@resend.dev>",   // Replace with your verified domain
      to:      [input.to],
      subject: input.nudge.subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error ${response.status}: ${err}`);
  }
}

// ─── HTML email template ─────────────────────────────────────
function buildEmailHtml(input: SendNudgeEmailInput): string {
  const { userName, nudge, logId } = input;
  const urgencyColor =
    nudge.urgency === "high"   ? "#f07a7a" :
    nudge.urgency === "medium" ? "#f0c97a" : "#a8f07a";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your morning nudge</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0a;padding:40px 20px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr>
          <td style="padding-bottom:28px;">
            <span style="font-size:22px;font-weight:900;color:#f0ebe0;letter-spacing:-0.02em;">
              nudge<span style="color:#a8f07a;">.</span>
            </span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#111110;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">

            <!-- Top accent line -->
            <div style="height:3px;background:linear-gradient(90deg,${urgencyColor},#7af0b8);"></div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:28px 32px 24px;">

                  <!-- Greeting -->
                  <p style="margin:0 0 6px;font-size:13px;color:#5a5650;letter-spacing:0.06em;text-transform:uppercase;">
                    Good morning, ${userName}
                  </p>

                  <!-- Lead badge -->
                  <div style="display:inline-block;background:rgba(168,240,122,0.1);border:1px solid rgba(168,240,122,0.25);border-radius:6px;padding:4px 12px;margin-bottom:20px;">
                    <span style="font-size:12px;font-weight:600;color:#a8f07a;">
                      🔔 ${nudge.leadName}
                    </span>
                  </div>

                  <!-- Nudge message -->
                  <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#d0cab8;">
                    ${nudge.body.replace(/\n/g, "<br>")}
                  </p>

                  <!-- CTA -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#a8f07a;border-radius:8px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/inbox"
                           style="display:inline-block;padding:12px 24px;font-size:13px;font-weight:600;color:#0c0c0a;text-decoration:none;">
                          Open Lead Inbox →
                        </a>
                      </td>
                    </tr>
                  </table>

                  ${logId ? `
                  <!-- Follow-up tracking -->
                  <table cellpadding="0" cellspacing="0" style="margin-top:20px;">
                    <tr>
                      <td style="padding-bottom:8px;">
                        <p style="margin:0;font-size:12px;color:#5a5650;letter-spacing:0.04em;">
                          Did you reach out to ${nudge.leadName}?
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-right:8px;">
                              <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/nudge/followup?log_id=${logId}&response=yes"
                                 style="display:inline-block;padding:8px 16px;font-size:12px;font-weight:600;color:#0c0c0a;background:#a8f07a;border-radius:6px;text-decoration:none;">
                                Yes, I did
                              </a>
                            </td>
                            <td>
                              <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/nudge/followup?log_id=${logId}&response=no"
                                 style="display:inline-block;padding:8px 16px;font-size:12px;font-weight:600;color:#d0cab8;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;text-decoration:none;">
                                Not yet
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  ` : ""}

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.07);">
                  <p style="margin:0;font-size:11px;color:#5a5650;line-height:1.6;">
                    You're receiving this because you have a Nudge account.<br>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#5a5650;">Manage notifications</a>
                    &nbsp;·&nbsp;
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#5a5650;">Unsubscribe</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Plain text fallback ──────────────────────────────────────
function buildEmailText(input: SendNudgeEmailInput): string {
  const { userName, nudge } = input;
  return [
    `Good morning, ${userName}`,
    "",
    `Today's nudge: ${nudge.leadName}`,
    "",
    nudge.body,
    "",
    `Open your inbox: ${process.env.NEXT_PUBLIC_APP_URL}/inbox`,
    "",
    "---",
    "Nudge — Your AI client memory",
    `Manage notifications: ${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  ].join("\n");
}

// ══════════════════════════════════════════════════════════════
// SUNDAY DIGEST EMAIL
// ══════════════════════════════════════════════════════════════

export interface SendDigestEmailInput {
  to:       string;
  userName: string;
  digest:   DigestMessage;
}

export async function sendDigestEmail(input: SendDigestEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const html = buildDigestHtml(input);
  const text = buildDigestText(input);

  const response = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    "Nudge <onboarding@resend.dev>",
      to:      [input.to],
      subject: input.digest.subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error ${response.status}: ${err}`);
  }
}

function buildDigestHtml(input: SendDigestEmailInput): string {
  const { userName, digest } = input;

  const urgencyColor = (u: string) =>
    u === "high" ? "#f07a7a" : u === "medium" ? "#f0c97a" : "#a8f07a";

  const entriesHtml = digest.entries.map((e, i) => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#171715; border:1px solid rgba(255,255,255,0.1); border-left:3px solid ${urgencyColor(e.urgency)}; border-radius:8px; padding:18px 20px;">
              <p style="margin:0 0 4px; font-size:11px; color:#5a5650; letter-spacing:0.08em; text-transform:uppercase;">
                ${i + 1} of ${digest.entries.length}
              </p>
              <p style="margin:0 0 8px; font-size:16px; font-weight:700; color:#f0ebe0;">
                ${e.name}
              </p>
              <p style="margin:0 0 12px; font-size:14px; color:#d0cab8; line-height:1.65;">
                ${e.reason}
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(168,240,122,0.08); border:1px solid rgba(168,240,122,0.2); border-radius:6px; padding:10px 14px;">
                    <p style="margin:0; font-size:11px; color:#5a5650; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">Suggested opening</p>
                    <p style="margin:0; font-size:13px; color:#a8f07a; font-style:italic;">"${e.opening}"</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0c0c0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0a;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

      <tr><td style="padding-bottom:24px;">
        <span style="font-size:22px;font-weight:900;color:#f0ebe0;letter-spacing:-0.02em;">
          nudge<span style="color:#a8f07a;">.</span>
        </span>
      </td></tr>

      <tr><td style="background:#111110;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <div style="height:3px;background:linear-gradient(90deg,#a8f07a,#7af0b8);"></div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:28px 28px 20px;">
            <p style="margin:0 0 4px;font-size:12px;color:#5a5650;letter-spacing:0.1em;text-transform:uppercase;">
              ☀ Sunday digest · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
            </p>
            <p style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f0ebe0;letter-spacing:-0.02em;">
              Good morning, ${userName}
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#d0cab8;line-height:1.7;">
              ${digest.intro}
            </p>
          </td></tr>

          <tr><td style="padding:0 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${entriesHtml}
            </table>
          </td></tr>

          <tr><td style="padding:16px 28px 24px;">
            <p style="margin:0;font-size:14px;color:#5a5650;font-style:italic;">${digest.outro}</p>
          </td></tr>

          <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.07);">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/inbox" style="display:inline-block;background:#a8f07a;color:#0c0c0a;font-size:13px;font-weight:600;padding:11px 22px;border-radius:7px;text-decoration:none;">
              Open Lead Inbox →
            </a>
          </td></tr>

          <tr><td style="padding:14px 28px;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0;font-size:11px;color:#5a5650;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="color:#5a5650;">Manage notifications</a>
            </p>
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildDigestText(input: SendDigestEmailInput): string {
  const { userName, digest } = input;
  const lines = [
    `Good morning, ${userName} — Sunday digest`,
    "",
    digest.intro,
    "",
  ];
  digest.entries.forEach((e, i) => {
    lines.push(`${i + 1}. ${e.name}`);
    lines.push(`   ${e.reason}`);
    lines.push(`   Opening: "${e.opening}"`);
    lines.push("");
  });
  lines.push(digest.outro);
  lines.push("");
  lines.push(`Open your inbox: ${process.env.NEXT_PUBLIC_APP_URL}/inbox`);
  return lines.join("\n");
}
