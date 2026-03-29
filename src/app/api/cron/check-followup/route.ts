import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIfEmailSentAfter, refreshAccessToken } from "@/lib/gmail";

/**
 * GET /api/cron/check-followup
 *
 * Runs every morning at 07:30 UTC (before the nudge at 08:30).
 * For each nudge sent yesterday where the user hasn't clicked Yes/No,
 * automatically checks Gmail to see if they actually reached out.
 *
 * Only works for users with Gmail connected + lead has an email address.
 * Users without Gmail get no auto-detection — manual buttons only.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find all nudges from yesterday that are still unanswered
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: pendingNudges, error } = await supabase
    .from("nudge_logs")
    .select(`
      id,
      user_id,
      lead_id,
      delivered_at,
      profiles:user_id (
        gmail_connected,
        gmail_access_token,
        gmail_refresh_token
      ),
      leads:lead_id (
        email
      )
    `)
    .eq("type", "daily")
    .eq("delivered", true)
    .is("followed_up", null)
    .gte("delivered_at", yesterday.toISOString())
    .lt("delivered_at", today.toISOString())
    .not("lead_id", "is", null);

  if (error) {
    console.error("check-followup cron: failed to fetch nudges:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pendingNudges?.length) {
    return NextResponse.json({ message: "No pending nudges to check", checked: 0 });
  }

  console.log(`check-followup: checking ${pendingNudges.length} unanswered nudges`);

  let autoYes = 0;
  let autoNo  = 0;
  let skipped = 0;

  for (const nudge of pendingNudges) {
    const profile = (Array.isArray(nudge.profiles) ? nudge.profiles[0] : nudge.profiles) as {
      gmail_connected: boolean;
      gmail_access_token: string | null;
      gmail_refresh_token: string | null;
    } | null;

    const lead = (Array.isArray(nudge.leads) ? nudge.leads[0] : nudge.leads) as { email: string | null } | null;

    // Skip if no Gmail or no lead email — can't auto-detect
    if (!profile?.gmail_connected || !profile.gmail_access_token || !lead?.email) {
      skipped++;
      continue;
    }

    const nudgeSentAt = new Date(nudge.delivered_at);

    try {
      let accessToken = profile.gmail_access_token;

      const didFollowUp = await checkIfEmailSentAfter(accessToken, lead.email, nudgeSentAt)
        .catch(async (err) => {
          if (err.message === "GMAIL_UNAUTHORIZED" && profile.gmail_refresh_token) {
            accessToken = await refreshAccessToken(profile.gmail_refresh_token);
            await supabase
              .from("profiles")
              .update({ gmail_access_token: accessToken })
              .eq("id", nudge.user_id);
            return checkIfEmailSentAfter(accessToken, lead.email!, nudgeSentAt);
          }
          throw err;
        });

      await supabase
        .from("nudge_logs")
        .update({
          followed_up:      didFollowUp,
          followed_up_at:   new Date().toISOString(),
          follow_up_source: "auto",
        })
        .eq("id", nudge.id);

      if (didFollowUp) autoYes++;
      else autoNo++;

      // Respect Gmail rate limits
      await new Promise((r) => setTimeout(r, 150));

    } catch (err) {
      console.warn(`check-followup: could not check nudge ${nudge.id}:`, err);
      skipped++;
    }
  }

  console.log(`check-followup done: ${autoYes} followed up, ${autoNo} did not, ${skipped} skipped`);

  return NextResponse.json({
    message:  "Follow-up check complete",
    total:    pendingNudges.length,
    auto_yes: autoYes,
    auto_no:  autoNo,
    skipped,
  });
}
