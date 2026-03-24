import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runNudgeForUser } from "@/lib/nudge-runner";

/**
 * GET /api/cron/morning-nudge
 *
 * Vercel Cron fires this at 08:30 UTC on weekdays (Mon–Fri).
 * Generates and sends a personalised AI nudge to every onboarded user.
 *
 * Protected by CRON_SECRET in the Authorization header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch all onboarded users
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("onboarded", true);

  if (error) {
    console.error("Morning nudge cron: failed to fetch profiles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ message: "No onboarded users", sent: 0 });
  }

  console.log(`Morning nudge: running for ${profiles.length} users`);

  // Run nudges concurrently (with a small batch limit to avoid rate limits)
  const BATCH_SIZE = 10;
  const results = [];

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((p) => runNudgeForUser(p.id))
    );
    results.push(...batchResults);

    // Small delay between batches to respect Claude API rate limits
    if (i + BATCH_SIZE < profiles.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Summarise results
  const sent    = results.filter((r) => r.status === "fulfilled" && r.value.status === "sent").length;
  const skipped = results.filter((r) => r.status === "fulfilled" && r.value.status === "skipped").length;
  const failed  = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.status === "error")
  ).length;

  console.log(`Morning nudge done: ${sent} sent, ${skipped} skipped, ${failed} failed`);

  return NextResponse.json({
    message: "Morning nudge complete",
    total:   profiles.length,
    sent,
    skipped,
    failed,
  });
}
