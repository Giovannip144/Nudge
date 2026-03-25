import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { sendPaymentConfirmedEmail, sendPaymentFailedEmail, sendCancellationEmail } from "@/lib/billing-emails";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Service role client — bypasses RLS for server-side updates
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const obj = event.data.object as Record<string, unknown>;
  console.log(`✅ Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const userId     = obj.client_reference_id as string;
        const customerId = obj.customer as string;
        const subId      = obj.subscription as string;

        console.log(`checkout.session.completed — userId: ${userId}, customerId: ${customerId}`);

        if (!userId) { console.error("❌ No client_reference_id!"); break; }

        const { error } = await supabase.from("profiles").update({
          stripe_customer_id:         customerId,
          stripe_subscription_id:     subId,
          stripe_subscription_status: "active",
          tier:                       "starter",
        }).eq("id", userId);

        if (error) console.error("❌ Supabase update failed:", error.message);
        else console.log("✅ Profile updated to active");

        const { data: profile } = await supabase
          .from("profiles").select("email, full_name").eq("id", userId).single();

        if (profile?.email) {
          await sendPaymentConfirmedEmail(profile.email, profile.full_name ?? "there").catch(console.error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const status     = obj.status as string;
        const customerId = obj.customer as string;

        const { data: profile } = await supabase
          .from("profiles").select("id").eq("stripe_customer_id", customerId).single();

        if (!profile) { console.warn(`No profile for customer ${customerId}`); break; }

        await supabase.from("profiles").update({
          stripe_subscription_id:     obj.id as string,
          stripe_subscription_status: status,
          tier: status === "active" ? "starter" : "free",
        }).eq("id", profile.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const customerId    = obj.customer as string;
        const billingReason = obj.billing_reason as string;
        if (billingReason === "subscription_create") break;

        const { data: profile } = await supabase
          .from("profiles").select("id, email, full_name").eq("stripe_customer_id", customerId).single();

        if (profile) {
          await supabase.from("profiles").update({ stripe_subscription_status: "active", tier: "starter" }).eq("id", profile.id);
          if (profile.email) await sendPaymentConfirmedEmail(profile.email, profile.full_name ?? "there").catch(console.error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const customerId = obj.customer as string;
        const { data: profile } = await supabase
          .from("profiles").select("id, email, full_name").eq("stripe_customer_id", customerId).single();

        if (profile) {
          await supabase.from("profiles").update({ stripe_subscription_status: "past_due" }).eq("id", profile.id);
          if (profile.email) await sendPaymentFailedEmail(profile.email, profile.full_name ?? "there", "1").catch(console.error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const { data: profile } = await supabase
          .from("profiles").select("id, email, full_name").eq("stripe_customer_id", obj.customer as string).single();

        if (profile) {
          await supabase.from("profiles").update({ tier: "free", stripe_subscription_status: "canceled" }).eq("id", profile.id);
          if (profile.email) await sendCancellationEmail(profile.email, profile.full_name ?? "there").catch(console.error);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
