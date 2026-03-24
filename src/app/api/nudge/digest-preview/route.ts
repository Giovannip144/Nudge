import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDigestForUser } from "@/lib/digest-runner";
import { generateSundayDigest, type DigestLead } from "@/lib/claude";
import { daysSince } from "@/lib/utils";

/**
 * POST /api/nudge/digest-preview
 * { send: false } → preview only, no email sent
 * { send: true  } → generate + send immediately
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body       = await request.json().catch(() => ({}));
  const shouldSend = body.send === true;

  if (shouldSend) {
    const result = await runDigestForUser(user.id);
    return NextResponse.json(result);
  }

  // Preview only — generate but don't send or log
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, note, status, last_contact_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .eq("nudge_active", true)
    .not("status", "in", '("won","paused","lost")');

  if (!leads?.length) {
    return NextResponse.json({ error: "No eligible leads for digest" }, { status: 400 });
  }

  const digestLeads: DigestLead[] = leads.map((l) => ({
    name:             l.name,
    note:             l.note,
    email:            l.email,
    daysSinceContact: daysSince(l.last_contact_at),
    lastContactDate:  l.last_contact_at,
    status:           l.status,
  }));

  console.log(`📅 Digest preview for ${profile?.full_name ?? "user"} — ${digestLeads.length} leads`);
  digestLeads.forEach((l) =>
    console.log(`  - ${l.name}: ${l.daysSinceContact}d | note: ${l.note?.slice(0, 60) ?? "none"}`)
  );

  const digest = await generateSundayDigest(
    profile?.full_name ?? profile?.email?.split("@")[0] ?? "there",
    digestLeads
  );

  return NextResponse.json({
    preview:  true,
    subject:  digest.subject,
    intro:    digest.intro,
    entries:  digest.entries,
    outro:    digest.outro,
    leadsIn:  digestLeads.length,
  });
}
