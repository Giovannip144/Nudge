import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runNudgeForUser } from "@/lib/nudge-runner";

/**
 * POST /api/nudge/generate
 *
 * Manually trigger a nudge for the authenticated user.
 * Used from the Settings page to test without waiting for the cron job.
 *
 * Pass { send: true } to actually send the email.
 * Pass { send: false } to preview only (default).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const shouldSend = body.send === true;

  if (shouldSend) {
    // Full run — generates message AND sends email
    const result = await runNudgeForUser(user.id);
    return NextResponse.json(result);
  }

  // Preview only — generate message but don't send or log
  const { generateNudgeMessage, pickLeadToNudge } = await import("@/lib/claude");
  const { daysSince } = await import("@/lib/utils");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: leads } = await supabase
    .from("leads")
    .select("name, note, status, last_contact_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .eq("nudge_active", true);

  if (!leads?.length) {
    return NextResponse.json({ error: "No active leads to nudge" }, { status: 400 });
  }

  const contexts = leads.map((l) => ({
    name:             l.name,
    note:             l.note,
    daysSinceContact: daysSince(l.last_contact_at),
    lastContactDate:  l.last_contact_at,
    status:           l.status,
  }));

  const lead = pickLeadToNudge(contexts);
  if (!lead) {
    return NextResponse.json({
      error: "All leads are recent or won/paused — nothing to nudge today",
    }, { status: 400 });
  }

  const nudge = await generateNudgeMessage(
    profile?.full_name ?? "there",
    lead
  );

  return NextResponse.json({
    preview: true,
    lead:    lead.name,
    subject: nudge.subject,
    message: nudge.body,
    urgency: nudge.urgency,
  });
}
