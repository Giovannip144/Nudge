// ══════════════════════════════════════════════════════════════
// NUDGE — Twilio WhatsApp Delivery
// Sends nudge messages via WhatsApp Business API.
// ══════════════════════════════════════════════════════════════

import type { NudgeMessage } from "./claude";

export interface SendWhatsAppInput {
  to: string;           // Phone number e.g. "+31612345678"
  userName: string;
  nudge: NudgeMessage;
}

// ─── Send WhatsApp message via Twilio ────────────────────────
export async function sendNudgeWhatsApp(input: SendWhatsAppInput): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM; // "whatsapp:+14155238886"

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio env vars missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM");
  }

  // Format the "to" number for WhatsApp
  const to = input.to.startsWith("whatsapp:")
    ? input.to
    : `whatsapp:${input.to}`;

  // Build the message body — max ~1600 chars for WhatsApp
  const body = buildWhatsAppBody(input.userName, input.nudge);

  console.log(`📱 Sending WhatsApp to ${to}`);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const response = await fetch(url, {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Twilio error ${response.status}: ${err}`);
  }

  const data = await response.json();
  console.log(`✅ WhatsApp sent — SID: ${data.sid}`);
}

// ─── Format the WhatsApp message ─────────────────────────────
function buildWhatsAppBody(userName: string, nudge: NudgeMessage): string {
  return [
    `🔔 *Good morning, ${userName}*`,
    "",
    nudge.body,
    "",
    `_nudge. — your AI client memory_`,
  ].join("\n");
}
