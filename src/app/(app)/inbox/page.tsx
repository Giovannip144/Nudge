import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InboxClient } from "@/components/inbox/InboxClient";
import { TrialBanner } from "@/components/billing/TrialBanner";
import type { Lead } from "@/types";

export default async function InboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leads, error }, { data: profile }] = await Promise.all([
    supabase.from("leads").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("profiles").select("stripe_subscription_status, trial_ends_at").eq("id", user.id).single(),
  ]);

  if (error) console.error("Failed to fetch leads:", error);

  const daysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 14;

  return (
    <>
      <TrialBanner status={profile?.stripe_subscription_status ?? "trialing"} daysLeft={daysLeft} />
      <InboxClient initialLeads={(leads as Lead[]) ?? []} />
    </>
  );
}
