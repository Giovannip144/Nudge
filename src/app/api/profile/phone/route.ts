import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Support updating phone only, or channel + phone together
  const updates: Record<string, string> = {};

  if (body.channel) {
    if (!["email", "whatsapp"].includes(body.channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }
    updates.channel = body.channel;
  }

  if (body.phone !== undefined) {
    if (body.channel === "whatsapp" && !body.phone?.trim()) {
      return NextResponse.json({ error: "Phone required for WhatsApp" }, { status: 400 });
    }
    updates.phone = body.phone?.trim() ?? "";
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
