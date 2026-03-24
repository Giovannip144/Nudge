import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Paywall } from "@/components/billing/Paywall";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { shouldShowPaywall, trialDaysRemaining } from "@/lib/stripe";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, tier, gmail_connected, stripe_subscription_status, trial_ends_at")
    .eq("id", user.id)
    .single();

  const subStatus   = profile?.stripe_subscription_status ?? "trialing";
  const trialEnds   = profile?.trial_ends_at ?? null;
  const showPaywall = shouldShowPaywall(subStatus, trialEnds);
  const daysLeft    = subStatus === "trialing" ? trialDaysRemaining(trialEnds) : 0;

  const paywallReason = (): "trial_expired" | "past_due" | "canceled" | "paused" => {
    if (subStatus === "past_due" || subStatus === "unpaid") return "past_due";
    if (subStatus === "canceled") return "canceled";
    if (subStatus === "paused")   return "paused";
    return "trial_expired";
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)" }}>
      <Topbar
        userName={profile?.full_name ?? user.email ?? ""}
        gmailConnected={profile?.gmail_connected ?? false}
      />

      {/* Trial banner — last 7 days, non-blocking */}
      {subStatus === "trialing" && daysLeft <= 7 && !showPaywall && (
        <TrialBanner daysLeft={daysLeft} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tier={profile?.tier ?? "free"}
          subStatus={subStatus}
          trialEndsAt={trialEnds}
          daysLeft={daysLeft}
        />
        <main className="flex-1 overflow-y-auto" style={{ position:"relative", zIndex:1 }}>
          {children}
        </main>
      </div>

      {/* Paywall overlay — blocks entire app when trial expired */}
      {showPaywall && (
        <Paywall
          reason={paywallReason()}
          userName={profile?.full_name ?? "there"}
          trialEnded={trialEnds ?? undefined}
        />
      )}
    </div>
  );
}
