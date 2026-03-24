import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, onboarding_step, channel, nudge_time")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_step === 5) {
    redirect("/inbox");
  }

  return (
    <OnboardingShell
      initialStep={(profile?.onboarding_step ?? 0) as 0 | 1 | 2 | 3 | 4 | 5}
      initialName={profile?.full_name ?? ""}
      initialEmail={profile?.email ?? user.email ?? ""}
    />
  );
}
