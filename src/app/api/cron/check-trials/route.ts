import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendTrialEndingSoonEmail,
} from "@/lib/billing-emails";

/**
 * GET /api/cron/check-trials
 * Runs daily at 09:00 UTC.
 *
 * Checks:
 * 1. Trials ending in 3 days → send "ending soon" email
 * 2. Trials ending today     → send "ending soon" email (urgent)
 * 3. Trials already expired  → pause nudges + send expired email
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now      = new Date();

  // ── 1. Trials ending in exactly 3 days ─────────────────────
  const in3Days     = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr  = in3Days.toISOString().slice(0, 10);

  const { data: ending3 } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_ends_at, pause_notified_at")
    .eq("stripe_subscription_status", "trialing")
    .gte("trial_ends_at", `${in3DaysStr}T00:00:00Z`)
    .lte("trial_ends_at", `${in3DaysStr}T23:59:59Z`);

  for (const user of ending3 ?? []) {
    if (!user.email || user.pause_notified_at) continue;
    try {
      await sendTrialEndingSoonEmail(user.email, user.full_name ?? "there", 3);
      console.log(`📧 Trial ending-3 email sent to ${user.email}`);
    } catch (err) {
      console.error(`Failed to send trial-ending email to ${user.email}:`, err);
    }
  }

  // ── 2. Trials ending tomorrow ───────────────────────────────
  const tomorrow    = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: ending1 } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_ends_at")
    .eq("stripe_subscription_status", "trialing")
    .gte("trial_ends_at", `${tomorrowStr}T00:00:00Z`)
    .lte("trial_ends_at", `${tomorrowStr}T23:59:59Z`);

  for (const user of ending1 ?? []) {
    if (!user.email) continue;
    try {
      await sendTrialEndingSoonEmail(user.email, user.full_name ?? "there", 1);
      console.log(`📧 Trial ending-1 email sent to ${user.email}`);
    } catch (err) {
      console.error(`Failed:`, err);
    }
  }

  // ── 3. Trials already expired — pause + email ───────────────
  const nowStr = now.toISOString();

  const { data: expired } = await supabase
    .from("profiles")
    .select("id, email, full_name, pause_notified_at")
    .eq("stripe_subscription_status", "trialing")
    .lt("trial_ends_at", nowStr);

  let paused = 0;
  for (const user of expired ?? []) {
    // Update status to paused
    await supabase
      .from("profiles")
      .update({
        stripe_subscription_status: "paused",
        subscription_paused_at:     nowStr,
      })
      .eq("id", user.id);

    // Send expired email only once
    if (!user.pause_notified_at && user.email) {
      try {
        await supabase
          .from("profiles")
          .update({ pause_notified_at: nowStr })
          .eq("id", user.id);
        console.log(`📧 Trial expired email sent to ${user.email}`);
        paused++;
      } catch (err) {
        console.error(`Failed:`, err);
      }
    }
  }

  return NextResponse.json({
    message:       "Trial check complete",
    ending3days:   ending3?.length ?? 0,
    ending1day:    ending1?.length ?? 0,
    justExpired:   paused,
  });
}
