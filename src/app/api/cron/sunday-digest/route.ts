import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDigestForUser } from "@/lib/digest-runner";

/**
 * GET /api/cron/sunday-digest
 * Vercel Cron fires this every Sunday at 10:00 UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("onboarded", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ message: "No users", sent: 0 });
  }

  console.log(`📅 Sunday digest: running for ${profiles.length} users`);

  const results = await Promise.allSettled(
    profiles.map((p) => runDigestForUser(p.id))
  );

  const sent    = results.filter((r) => r.status === "fulfilled" && r.value.status === "sent").length;
  const skipped = results.filter((r) => r.status === "fulfilled" && r.value.status === "skipped").length;
  const failed  = results.filter((r) => r.status === "rejected"  || (r.status === "fulfilled" && r.value.status === "error")).length;

  return NextResponse.json({ message: "Sunday digest complete", total: profiles.length, sent, skipped, failed });
}
