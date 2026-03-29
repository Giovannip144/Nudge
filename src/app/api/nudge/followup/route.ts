import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/nudge/followup?log_id=...&response=yes|no
 *
 * Called when a user clicks "Yes" or "No" in the nudge email.
 * Records whether they followed up with the lead.
 * No auth required — the log_id UUID acts as the token.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const logId    = searchParams.get("log_id");
  const response = searchParams.get("response");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nudge-neon.vercel.app";

  if (!logId || !response || !["yes", "no"].includes(response)) {
    return NextResponse.redirect(`${appUrl}/inbox`);
  }

  const supabase = createAdminClient();

  await supabase
    .from("nudge_logs")
    .update({
      followed_up:      response === "yes",
      followed_up_at:   new Date().toISOString(),
      follow_up_source: "manual",
    })
    .eq("id", logId);

  // Redirect to inbox — a simple thank-you via query param
  return NextResponse.redirect(`${appUrl}/inbox?followup=${response}`);
}
