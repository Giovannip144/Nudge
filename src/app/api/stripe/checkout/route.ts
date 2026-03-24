import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCustomer, createCheckoutSession } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!user) return NextResponse.redirect(`${base}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.email) return NextResponse.redirect(`${base}/settings?error=no_email`);

  try {
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      customerId = await getOrCreateCustomer(user.id, profile.email, profile.full_name);
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const url = await createCheckoutSession({
      customerId,
      userId:     user.id,
      successUrl: `${base}/settings?payment=success`,
      cancelUrl:  `${base}/upgrade?payment=cancelled`,
    });

    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(`${base}/upgrade?error=checkout_failed`);
  }
}
