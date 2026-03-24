import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanLeadsForUser, refreshAccessToken } from "@/lib/gmail";

/**
 * POST /api/gmail/scan
 * Scans Gmail for the authenticated user's leads and updates
 * last_contact_at on each lead that has an email address.
 *
 * Called:
 *  - Immediately after Gmail connect (via callback route)
 *  - Daily by the cron job (/api/cron/daily-scan)
 *  - Manually by the user from Settings
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Determine user — either from session or from cron header
  let userId: string | null = null;

  const internalKey = request.headers.get("x-internal-key");
  const isInternalCall =
    internalKey === (process.env.CRON_SECRET ?? "") && internalKey !== "";

  if (isInternalCall) {
    // Cron/internal call: user ID passed in header
    userId = request.headers.get("x-user-id");
  } else {
    // Normal authenticated call
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile with Gmail tokens
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("gmail_access_token, gmail_refresh_token, gmail_connected")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.gmail_connected || !profile.gmail_access_token) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  // Fetch all active leads with email addresses
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, email, name")
    .eq("user_id", userId)
    .is("archived_at", null)
    .not("email", "is", null);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads?.length) {
    return NextResponse.json({ message: "No leads with email addresses to scan", updated: 0 });
  }

  let accessToken = profile.gmail_access_token;

  try {
    // Run the Gmail scan
    const results = await scanLeadsForUser(accessToken, leads);

    // Update each lead's last_contact_at in the database
    let updatedCount = 0;
    for (const result of results) {
      if (!result.lastEmailDate) continue;

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          last_contact_at:   result.lastEmailDate,
          last_contact_type: "email",
        })
        .eq("id", result.leadId)
        .eq("user_id", userId);

      if (!updateError) updatedCount++;

      // Upsert into gmail_cache table for audit trail
      await supabase.from("gmail_cache").upsert(
        {
          user_id:         userId,
          lead_id:         result.leadId,
          last_email_date: result.lastEmailDate,
          direction:       result.direction,
          scanned_at:      new Date().toISOString(),
        },
        { onConflict: "user_id,lead_id" }
      );
    }

    return NextResponse.json({
      message: "Scan complete",
      scanned:  leads.length,
      updated:  updatedCount,
    });
  } catch (err) {
    // Access token may have expired — try refreshing once
    if (
      err instanceof Error &&
      err.message === "GMAIL_UNAUTHORIZED" &&
      profile.gmail_refresh_token
    ) {
      try {
        accessToken = await refreshAccessToken(profile.gmail_refresh_token);

        // Store the new access token
        await supabase
          .from("profiles")
          .update({ gmail_access_token: accessToken })
          .eq("id", userId);

        // Retry the scan with the fresh token
        const results = await scanLeadsForUser(accessToken, leads);
        let updatedCount = 0;

        for (const result of results) {
          if (!result.lastEmailDate) continue;
          await supabase
            .from("leads")
            .update({
              last_contact_at:   result.lastEmailDate,
              last_contact_type: "email",
            })
            .eq("id", result.leadId)
            .eq("user_id", userId);
          updatedCount++;
        }

        return NextResponse.json({
          message:  "Scan complete (token refreshed)",
          scanned:  leads.length,
          updated:  updatedCount,
        });
      } catch (refreshErr) {
        // Refresh token invalid — mark Gmail as disconnected
        await supabase
          .from("profiles")
          .update({ gmail_connected: false })
          .eq("id", userId);

        return NextResponse.json(
          { error: "Gmail token expired. Please reconnect Gmail in Settings." },
          { status: 401 }
        );
      }
    }

    console.error("Gmail scan error:", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
