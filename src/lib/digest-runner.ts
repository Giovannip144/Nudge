// ══════════════════════════════════════════════════════════════
// NUDGE — Sunday Digest Runner
// Generates and sends the weekly digest for a single user.
// ══════════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/server";
import { generateSundayDigest, type DigestLead } from "@/lib/claude";
import { sendDigestEmail } from "@/lib/resend";
import { getConversationContext, refreshAccessToken } from "@/lib/gmail";
import { daysSince } from "@/lib/utils";

export interface RunDigestResult {
  userId:   string;
  status:   "sent" | "skipped" | "error";
  entries?: number;
  error?:   string;
}

export async function runDigestForUser(userId: string): Promise<RunDigestResult> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, channel, phone, nudge_time, gmail_connected, gmail_access_token, gmail_refresh_token")
    .eq("id", userId)
    .single();

  if (!profile?.email) {
    return { userId, status: "skipped", error: "No email address" };
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, note, status, last_contact_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("nudge_active", true)
    .not("status", "in", '("won","paused","lost")');

  if (!leads?.length) {
    return { userId, status: "skipped", error: "No eligible leads" };
  }

  const digestLeads: DigestLead[] = leads.map((l) => ({
    name:             l.name,
    note:             l.note,
    email:            l.email,
    daysSinceContact: daysSince(l.last_contact_at),
    lastContactDate:  l.last_contact_at,
    status:           l.status,
  }));

  // Enrich top leads with Gmail conversation context (max 3 leads to stay within rate limits)
  if (profile.gmail_connected && profile.gmail_access_token) {
    let accessToken = profile.gmail_access_token;
    const leadsWithEmail = digestLeads.filter((l) => l.email).slice(0, 3);

    for (const lead of leadsWithEmail) {
      try {
        const context = await getConversationContext(accessToken, lead.email!, 3)
          .catch(async (err) => {
            if (err.message === "GMAIL_UNAUTHORIZED" && profile.gmail_refresh_token) {
              accessToken = await refreshAccessToken(profile.gmail_refresh_token);
              await supabase.from("profiles").update({ gmail_access_token: accessToken }).eq("id", userId);
              return getConversationContext(accessToken, lead.email!, 3);
            }
            throw err;
          });

        if (context.snippets.length > 0) {
          lead.conversation = context;
          console.log(`📧 Digest: fetched ${context.snippets.length} snippets for ${lead.name}`);
        }
      } catch {
        // Non-fatal — this lead will use note-only context
      }

      // Respect Gmail rate limits between leads
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  try {
    console.log(`📅 Generating Sunday digest for ${profile.full_name ?? profile.email} — ${digestLeads.length} leads`);

    const digest = await generateSundayDigest(
      profile.full_name ?? profile.email.split("@")[0],
      digestLeads
    );

    await sendDigestEmail({
      to:       profile.email,
      userName: profile.full_name ?? "there",
      digest,
    });

    // Log to nudge_logs
    await supabase.from("nudge_logs").insert({
      user_id:       userId,
      lead_id:       null,
      type:          "weekly",
      channel:       "email",
      message:       digest.entries.map((e) => `${e.name}: ${e.reason}`).join(" | "),
      leads_flagged: [],
      delivered:     true,
      delivered_at:  new Date().toISOString(),
    });

    console.log(`✅ Sunday digest sent — ${digest.entries.length} entries`);

    return { userId, status: "sent", entries: digest.entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Digest failed for ${userId}:`, msg);

    await supabase.from("nudge_logs").insert({
      user_id:   userId,
      lead_id:   null,
      type:      "weekly",
      channel:   "email",
      message:   "",
      delivered: false,
      error:     msg,
    });

    return { userId, status: "error", error: msg };
  }
}
