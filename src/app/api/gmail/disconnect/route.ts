import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/gmail/disconnect
 * Revokes Gmail access and clears stored tokens.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) return NextResponse.redirect(`${base}/login`);

  // Get current access token to revoke it with Google
  const { data: profile } = await supabase
    .from("profiles")
    .select("gmail_access_token")
    .eq("id", user.id)
    .single();

  // Revoke the token with Google (best effort)
  if (profile?.gmail_access_token) {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${profile.gmail_access_token}`,
      { method: "POST" }
    ).catch(() => {});
  }

  // Clear tokens from database
  await supabase
    .from("profiles")
    .update({
      gmail_access_token:  null,
      gmail_refresh_token: null,
      gmail_connected:     false,
    })
    .eq("id", user.id);

  return NextResponse.redirect(`${base}/settings?gmail=denied`);
}
