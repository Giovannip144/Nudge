import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/daily-scan
 *
 * Triggered daily by Vercel Cron (configured in vercel.json).
 * Scans Gmail for every user who has gmail_connected = true.
 *
 * Protected by CRON_SECRET — Vercel sets the Authorization header
 * automatically when calling cron jobs.
 */
export async function GET(request: NextRequest) {
  // Verify the request comes from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Get all users with Gmail connected
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("gmail_connected", true);

  if (error) {
    console.error("Cron: failed to fetch profiles:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ message: "No users with Gmail connected", scanned: 0 });
  }

  console.log(`Cron: scanning Gmail for ${profiles.length} users`);

  // Trigger scan for each user — fire and don't await to avoid timeout
  const results = await Promise.allSettled(
    profiles.map((profile) =>
      fetch(`${base}/api/gmail/scan`, {
        method: "POST",
        headers: {
          "Content-Type":   "application/json",
          "x-user-id":      profile.id,
          "x-internal-key": process.env.CRON_SECRET ?? "",
        },
      })
        .then((r) => r.json())
        .then((data) => ({ userId: profile.id, ...data }))
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed    = results.filter((r) => r.status === "rejected").length;

  console.log(`Cron: done. ${succeeded} succeeded, ${failed} failed`);

  return NextResponse.json({
    message:   "Daily scan complete",
    total:     profiles.length,
    succeeded,
    failed,
  });
}
