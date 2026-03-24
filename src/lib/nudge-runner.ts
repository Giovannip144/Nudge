// ══════════════════════════════════════════════════════════════
// NUDGE — Core nudge runner
// Generates and sends a contextual nudge for a single user.
// When Gmail is connected: reads last 5 email snippets per lead.
// When not connected: falls back to note + days of silence.
// ══════════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/server";
import { generateNudgeMessage, pickLeadToNudge, type LeadContext } from "@/lib/claude";
import { getConversationContext, refreshAccessToken } from "@/lib/gmail";
import { sendNudgeEmail } from "@/lib/resend";
import { sendNudgeWhatsApp } from "@/lib/twilio";
import { daysSince } from "@/lib/utils";

export interface RunNudgeResult {
  userId:    string;
  status:    "sent" | "skipped" | "error";
  channel?:  "email" | "whatsapp";
  leadName?: string;
  message?:  string;
  contextual?: boolean;
  error?:    string;
}

export async function runNudgeForUser(userId: string): Promise<RunNudgeResult> {
  const supabase = await createClient();

  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email, channel, phone, nudge_time, gmail_connected, gmail_access_token, gmail_refresh_token, stripe_subscription_status, trial_ends_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { userId, status: "error", error: "Profile not found" };
  }

  // Don't send nudges to paused/expired/canceled users
  const subStatus = profile.stripe_subscription_status ?? "trialing";
  const trialEnds = profile.trial_ends_at ?? null;
  const { shouldShowPaywall } = await import("@/lib/stripe");
  if (shouldShowPaywall(subStatus, trialEnds)) {
    return { userId, status: "skipped", error: "Subscription paused or trial expired" };
  }

  const channel = profile.channel ?? "email";

  if (channel === "email" && !profile.email) {
    return { userId, status: "skipped", error: "No email address" };
  }
  if (channel === "whatsapp" && !profile.phone) {
    console.warn(`User ${userId}: WhatsApp selected but no phone — falling back to email`);
  }

  // 2. Fetch active leads
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, email, note, status, last_contact_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("nudge_active", true);

  if (leadsError || !leads?.length) {
    return { userId, status: "skipped", error: "No active leads" };
  }

  // 3. Build lead contexts (without conversation yet)
  const contexts: LeadContext[] = leads.map((l) => ({
    name:             l.name,
    note:             l.note,
    daysSinceContact: daysSince(l.last_contact_at),
    lastContactDate:  l.last_contact_at,
    status:           l.status,
  }));

  // 4. Pick the most stale lead
  const leadToNudge = pickLeadToNudge(contexts);
  if (!leadToNudge) {
    return { userId, status: "skipped", error: "No eligible leads" };
  }

  const leadRecord = leads.find((l) => l.name === leadToNudge.name);

  // 5. Fetch conversation snippets from Gmail if connected + lead has email
  if (
    profile.gmail_connected &&
    profile.gmail_access_token &&
    leadRecord?.email
  ) {
    try {
      let accessToken = profile.gmail_access_token;

      const context = await getConversationContext(accessToken, leadRecord.email, 5)
        .catch(async (err) => {
          // Try refreshing the token once if unauthorized
          if (err.message === "GMAIL_UNAUTHORIZED" && profile.gmail_refresh_token) {
            accessToken = await refreshAccessToken(profile.gmail_refresh_token);
            await supabase
              .from("profiles")
              .update({ gmail_access_token: accessToken })
              .eq("id", userId);
            return getConversationContext(accessToken, leadRecord.email!, 5);
          }
          throw err;
        });

      if (context.snippets.length > 0) {
        leadToNudge.conversation = context;
        console.log(`📧 Fetched ${context.snippets.length} email snippets for ${leadRecord.name}`);
      }
    } catch (err) {
      // Non-fatal — fall back to note-only nudge
      console.warn(`Could not fetch Gmail snippets for ${leadRecord.name}:`, err);
    }
  }

  try {
    // 6. Generate contextual nudge via Claude
    const nudgeMsg = await generateNudgeMessage(
      profile.full_name ?? profile.email?.split("@")[0] ?? "there",
      leadToNudge
    );

    // 7. Send via correct channel
    const useWhatsApp = channel === "whatsapp" && !!profile.phone;

    if (useWhatsApp) {
      await sendNudgeWhatsApp({
        to:       profile.phone!,
        userName: profile.full_name ?? "there",
        nudge:    nudgeMsg,
      });
    } else {
      await sendNudgeEmail({
        to:        profile.email!,
        userName:  profile.full_name ?? "there",
        nudge:     nudgeMsg,
        nudgeTime: profile.nudge_time?.slice(0, 5) ?? "08:30",
      });
    }

    // 8. Log to nudge_logs
    await supabase.from("nudge_logs").insert({
      user_id:       userId,
      lead_id:       leadRecord?.id ?? null,
      type:          "daily",
      channel:       useWhatsApp ? "whatsapp" : "email",
      message:       nudgeMsg.body,
      leads_flagged: leadRecord ? [leadRecord.id] : [],
      delivered:     true,
      delivered_at:  new Date().toISOString(),
    });

    console.log(`✅ Nudge sent for ${leadToNudge.name} — contextual: ${nudgeMsg.hasConversationContext}`);

    return {
      userId,
      status:    "sent",
      channel:   useWhatsApp ? "whatsapp" : "email",
      leadName:  leadToNudge.name,
      message:   nudgeMsg.body,
      contextual: nudgeMsg.hasConversationContext,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Nudge failed for user ${userId}:`, msg);

    await supabase.from("nudge_logs").insert({
      user_id:   userId,
      lead_id:   leadRecord?.id ?? null,
      type:      "daily",
      channel,
      message:   "",
      delivered: false,
      error:     msg,
    });

    return { userId, status: "error", error: msg };
  }
}
