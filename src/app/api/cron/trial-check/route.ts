import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTrialEndingSoonEmail, sendAccountPausedEmail } from "@/lib/billing-emails";

/**
 * GET /api/cron/trial-check
 * Runs daily at 09:00. Checks:
 * 1. Trials ending in 2 days → warning email
 * 2. Trials expired → pause account + email
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now      = new Date();

  // ── 1. Warn users with 2 days left ────────────────────────
  const warningCutoff = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const { data: endingSoon } = await supabase
    .from("profiles")
    .select("id, email, full_name, trial_ends_at, pause_notified_at")
    .eq("stripe_subscription_status", "trialing")
    .lte("trial_ends_at", warningCutoff.toISOString())
    .gte("trial_ends_at", now.toISOString())
    .is("pause_notified_at", null); // Don't double-notify

  let warned = 0;
  for (const p of endingSoon ?? []) {
    if (!p.email) continue;
    const daysLeft = Math.max(1, Math.ceil(
      (new Date(p.trial_ends_at).getTime() - now.getTime()) / 86400000
    ));
    try {
      await sendTrialEndingSoonEmail(p.email, p.full_name ?? "there", daysLeft);
      warned++;
    } catch (err) {
      console.error(`Warning email failed for ${p.id}:`, err);
    }
  }

  // ── 2. Pause expired trials ────────────────────────────────
  const { data: expired } = await supabase
    .from("profiles")
    .select("id, email, full_name, subscription_paused_at")
    .eq("stripe_subscription_status", "trialing")
    .lt("trial_ends_at", now.toISOString())
    .is("subscription_paused_at", null);

  let paused = 0;
  for (const p of expired ?? []) {
    try {
      await supabase.from("profiles").update({
        stripe_subscription_status: "paused",
        tier:                       "free",
        subscription_paused_at:     now.toISOString(),
        pause_notified_at:          now.toISOString(),
      }).eq("id", p.id);

      if (p.email) {
        await sendAccountPausedEmail(p.email, p.full_name ?? "there");
      }
      paused++;
    } catch (err) {
      console.error(`Pause failed for ${p.id}:`, err);
    }
  }

  console.log(`Trial check: ${warned} warned, ${paused} paused`);

  return NextResponse.json({
    message: "Trial check complete",
    warned,
    paused,
  });
}
