import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConversationContext, refreshAccessToken } from "@/lib/gmail";

/**
 * GET /api/gmail/conversations?lead_id=xxx
 *
 * Fetches the last 5 email snippets between the current user and a specific lead.
 * Used by the DetailPanel to show conversation history.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = new URL(request.url).searchParams.get("lead_id");
  if (!leadId) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

  // Get lead email
  const { data: lead } = await supabase
    .from("leads")
    .select("email, name")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single();

  if (!lead?.email) {
    return NextResponse.json({ snippets: [], reason: "no_email" });
  }

  // Get Gmail tokens
  const { data: profile } = await supabase
    .from("profiles")
    .select("gmail_connected, gmail_access_token, gmail_refresh_token")
    .eq("id", user.id)
    .single();

  if (!profile?.gmail_connected || !profile.gmail_access_token) {
    return NextResponse.json({ snippets: [], reason: "gmail_not_connected" });
  }

  try {
    let accessToken = profile.gmail_access_token;

    const context = await getConversationContext(accessToken, lead.email, 5)
      .catch(async (err) => {
        if (err.message === "GMAIL_UNAUTHORIZED" && profile.gmail_refresh_token) {
          try {
            accessToken = await refreshAccessToken(profile.gmail_refresh_token);
            await supabase.from("profiles").update({ gmail_access_token: accessToken }).eq("id", user.id);
            return getConversationContext(accessToken, lead.email!, 5);
          } catch {
            // Refresh token also expired — disconnect Gmail so user knows to reconnect
            await supabase.from("profiles").update({ gmail_connected: false }).eq("id", user.id);
            return null; // signal token expired
          }
        }
        throw err;
      });

    if (context === null) {
      return NextResponse.json({ snippets: [], reason: "gmail_token_expired" });
    }

    return NextResponse.json({
      leadName:    lead.name,
      leadEmail:   lead.email,
      snippets:    context.snippets,
      threadCount: context.threadCount,
    });

  } catch (err) {
    console.error("conversations route error:", err);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
