import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/gmail";

/**
 * GET /api/gmail/callback
 * Google redirects here after the user grants gmail.readonly.
 * We exchange the code for tokens and store them in the profile.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");   // userId passed through OAuth
  const error = searchParams.get("error");
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // User denied access
  if (error || !code) {
    console.warn("Gmail OAuth denied or missing code:", error);
    return NextResponse.redirect(`${base}/settings?gmail=denied`);
  }

  // Validate that the user making the request matches the state
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== state) {
    return NextResponse.redirect(`${base}/settings?gmail=error`);
  }

  try {
    // Exchange code → access_token + refresh_token
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in profiles table
    // Note: for production, encrypt tokens at rest using Supabase Vault
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        gmail_access_token:  tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_connected:     true,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to store Gmail tokens:", updateError);
      return NextResponse.redirect(`${base}/settings?gmail=error`);
    }

    // Trigger an immediate scan so leads show data right away
    await fetch(`${base}/api/gmail/scan`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "x-user-id":     user.id,
        "x-internal-key": process.env.CRON_SECRET ?? "",
      },
    }).catch(() => {
      // Non-blocking — scan failure shouldn't break the OAuth flow
    });

    return NextResponse.redirect(`${base}/settings?gmail=connected`);
  } catch (err) {
    console.error("Gmail token exchange error:", err);
    return NextResponse.redirect(`${base}/settings?gmail=error`);
  }
}
