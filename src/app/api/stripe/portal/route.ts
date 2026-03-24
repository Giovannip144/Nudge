import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) return NextResponse.redirect(`${base}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) return NextResponse.redirect(`${base}/upgrade`);

  try {
    const url = await createPortalSession(profile.stripe_customer_id, `${base}/settings`);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.redirect(`${base}/settings?error=portal_failed`);
  }
}
