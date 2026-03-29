import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLastEmailDateForContact, refreshAccessToken } from "@/lib/gmail";
import type { CreateLeadInput } from "@/types";

// GET /api/leads — fetch all leads for the current user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/leads — create a new lead
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check free tier limit (10 leads)
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("archived_at", null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier === "free" && (count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Free tier limit reached. Upgrade to add more leads." },
      { status: 403 }
    );
  }

  const body: CreateLeadInput = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      note: body.note?.trim() || null,
      status: body.status || "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget Gmail scan for this new lead if Gmail is connected and lead has email
  if (data.email) {
    void (async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("gmail_connected, gmail_access_token, gmail_refresh_token")
          .eq("id", user.id)
          .single();

        if (!profile?.gmail_connected || !profile.gmail_access_token) return;

        let accessToken = profile.gmail_access_token;
        let result = await getLastEmailDateForContact(accessToken, data.email)
          .catch(async (err) => {
            if (err.message === "GMAIL_UNAUTHORIZED" && profile.gmail_refresh_token) {
              accessToken = await refreshAccessToken(profile.gmail_refresh_token);
              await supabase.from("profiles").update({ gmail_access_token: accessToken }).eq("id", user.id);
              return getLastEmailDateForContact(accessToken, data.email);
            }
            throw err;
          });

        if (result.date) {
          await supabase
            .from("leads")
            .update({ last_contact_at: result.date, last_contact_type: "email" })
            .eq("id", data.id)
            .eq("user_id", user.id);
        }
      } catch {
        // Non-fatal — lead is already saved, scan will retry tomorrow via cron
      }
    })();
  }

  return NextResponse.json({ data }, { status: 201 });
}
