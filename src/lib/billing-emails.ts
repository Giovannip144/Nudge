// ══════════════════════════════════════════════════════════════
// NUDGE — Billing Email Templates
// ══════════════════════════════════════════════════════════════

const FROM    = "Nudge <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

function wrap(accent: string, content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0c0c0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0a;padding:40px 20px;">
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td style="padding-bottom:24px;"><span style="font-size:22px;font-weight:900;color:#f0ebe0;">nudge<span style="color:${accent};">.</span></span></td></tr>
  <tr><td style="background:#111110;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
    <div style="height:3px;background:${accent};"></div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 32px;">${content}</td></tr>
      <tr><td style="padding:14px 32px;border-top:1px solid rgba(255,255,255,0.07);">
        <p style="margin:0;font-size:11px;color:#5a5650;"><a href="${APP_URL}/settings" style="color:#5a5650;">Manage subscription</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendPaymentSuccessEmail(to: string, userName: string, amount: string, nextDate: string) {
  const html = wrap("#a8f07a", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Payment confirmed</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">Thanks, ${userName} ✓</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">Your payment of <strong style="color:#f0ebe0;">${amount}</strong> went through. Daily nudges keep coming every morning.</p>
    <div style="background:#171715;border:1px solid rgba(168,240,122,0.2);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#5a5650;">Next billing date</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#f0ebe0;">${nextDate}</p>
    </div>
    <a href="${APP_URL}/inbox" style="display:inline-block;background:#a8f07a;color:#0c0c0a;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Lead Inbox →</a>
  `);
  await sendEmail(to, "Payment received — welcome to Nudge ✓", html, `Thanks ${userName}! Payment of ${amount} received. Next billing: ${nextDate}.`);
}

export async function sendPaymentFailedEmail(to: string, userName: string, retryDate: string) {
  const html = wrap("#f0c97a", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Payment issue</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">Hey ${userName}, small hiccup</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">We couldn't process your payment — it happens. Your account stays active while we retry automatically on <strong style="color:#f0ebe0;">${retryDate}</strong>.</p>
    <p style="margin:0 0 20px;font-size:14px;color:#d0cab8;line-height:1.7;">Want to sort it out now? Update your payment details below — takes 30 seconds.</p>
    <a href="${APP_URL}/api/stripe/portal" style="display:inline-block;background:#f0c97a;color:#0c0c0a;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Update payment details →</a>
  `);
  await sendEmail(to, "Payment didn't go through — quick heads up", html, `Hey ${userName} — payment issue. We'll retry ${retryDate}. Fix it: ${APP_URL}/api/stripe/portal`);
}

export async function sendAccountPausedEmail(to: string, userName: string) {
  const html = wrap("#f0ebe0", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Your briefings are paused</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">Hey ${userName}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">Your 14-day free trial has ended, so your daily nudges are paused for now. Your leads and all your data are completely safe — nothing is deleted.</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">To pick up where you left off, start your subscription at <strong style="color:#a8f07a;">€9/month</strong> — your early bird rate, locked in forever.</p>
    <div style="background:rgba(168,240,122,0.06);border:1px solid rgba(168,240,122,0.2);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;color:#a8f07a;font-weight:600;">What comes back when you subscribe:</p>
      <p style="margin:0;font-size:13px;color:#d0cab8;line-height:1.7;">✓ Daily morning nudge &nbsp;·&nbsp; ✓ Sunday digest &nbsp;·&nbsp; ✓ Gmail auto-sync &nbsp;·&nbsp; ✓ Unlimited leads</p>
    </div>
    <a href="${APP_URL}/upgrade" style="display:inline-block;background:#a8f07a;color:#0c0c0a;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;">Resume for €9/month →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#5a5650;">No hard feelings if now isn't the right time — your data stays safe for 90 days.</p>
  `);
  await sendEmail(to, "Your Nudge briefings are paused — here's how to resume", html, `Hey ${userName} — trial ended, briefings paused. Resume at €9/month: ${APP_URL}/upgrade`);
}

export async function sendTrialEndingSoonEmail(to: string, userName: string, daysLeft: number) {
  const html = wrap("#a8f07a", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Trial ending soon</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">Good morning, ${userName}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">Your free trial ends in <strong style="color:#f0ebe0;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>. After that, your daily nudges pause unless you subscribe.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#d0cab8;line-height:1.7;">Early bird rate is still <strong style="color:#a8f07a;">€9/month</strong> — locked in forever, goes up to €19 after 100 users.</p>
    <a href="${APP_URL}/upgrade" style="display:inline-block;background:#a8f07a;color:#0c0c0a;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;">Lock in €9/month →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#5a5650;">No credit card needed until you confirm. You stay in full control.</p>
  `);
  await sendEmail(to, `${daysLeft} days left in your free trial`, html, `Hey ${userName} — ${daysLeft} days left. Lock in €9/month: ${APP_URL}/upgrade`);
}

// ─── Subscription canceled ────────────────────────────────────
export async function sendCancellationEmail(to: string, name: string) {
  const html = wrap("#f0ebe0", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Subscription canceled</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">Hey ${name}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">Your Nudge subscription has been canceled. Your access continues until the end of your current billing period, after which nudges will pause.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#d0cab8;line-height:1.7;">Your leads, notes, and Gmail connection are all still there — no need to start from scratch if you come back.</p>
    <a href="${APP_URL}/upgrade" style="display:inline-block;background:rgba(255,255,255,0.08);color:#f0ebe0;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;border:1px solid rgba(255,255,255,0.15);">Reactivate anytime →</a>
  `);
  await sendEmail(to, "Your Nudge subscription has been canceled", html, `Hey ${name} — subscription canceled. Your data is safe. Reactivate anytime: ${APP_URL}/upgrade`);
}
export async function sendPaymentConfirmedEmail(to: string, name: string) {
  const html = wrap("#a8f07a", `
    <p style="margin:0 0 6px;font-size:12px;color:#5a5650;text-transform:uppercase;letter-spacing:.06em;">Welcome to Nudge</p>
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0ebe0;">You're all set, ${name} ✓</p>
    <p style="margin:0 0 20px;font-size:15px;color:#d0cab8;line-height:1.7;">Your subscription is active. Starting tomorrow morning you'll receive your daily AI nudge — specific, contextual, and actionable.</p>
    <div style="background:rgba(168,240,122,0.06);border:1px solid rgba(168,240,122,0.2);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#d0cab8;line-height:1.7;">✓ Daily morning nudge &nbsp;·&nbsp; ✓ Sunday digest &nbsp;·&nbsp; ✓ Gmail auto-sync &nbsp;·&nbsp; ✓ Unlimited leads</p>
    </div>
    <a href="${APP_URL}/inbox" style="display:inline-block;background:#a8f07a;color:#0c0c0a;font-size:14px;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;">Open your inbox →</a>
  `);
  await sendEmail(to, "You're in — welcome to Nudge ✓", html, `Welcome ${name}! Your subscription is active. Open your inbox: ${APP_URL}/inbox`);
}