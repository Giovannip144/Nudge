import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGmailAuthUrl } from "@/lib/gmail";

/**
 * GET /api/gmail/connect
 * Redirects the authenticated user to Google's OAuth consent screen
 * requesting gmail.readonly scope.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID not configured in environment variables" },
      { status: 500 }
    );
  }

  const authUrl = buildGmailAuthUrl(user.id);
  return NextResponse.redirect(authUrl);
}
