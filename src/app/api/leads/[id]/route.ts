import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UpdateLeadInput } from "@/types";

// GET /api/leads/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)   // RLS is also enforced, but explicit is clearer
    .single();

  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data });
}

// PATCH /api/leads/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: UpdateLeadInput = await request.json();

  // Sanitise — only allow known fields
  const allowed: UpdateLeadInput = {};
  if (body.name !== undefined)           allowed.name = body.name?.trim() ;
  if (body.email !== undefined)          allowed.email = body.email?.trim() || undefined;
  if (body.note !== undefined)           allowed.note = body.note?.trim() || undefined;
  if (body.status !== undefined)         allowed.status = body.status;
  if (body.last_contact_at !== undefined) allowed.last_contact_at = body.last_contact_at;
  if (body.snooze_until !== undefined)   allowed.snooze_until = body.snooze_until;
  if (body.nudge_active !== undefined)   allowed.nudge_active = body.nudge_active;

  const { data, error } = await supabase
    .from("leads")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

// DELETE /api/leads/[id] — soft delete (sets archived_at)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("leads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
