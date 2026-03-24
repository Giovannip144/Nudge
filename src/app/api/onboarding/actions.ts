"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingLeadSlot } from "@/types";

interface CompleteOnboardingInput {
  name: string;
  email: string;
  channel: "email" | "whatsapp";
  phone?: string;
  nudgeTime: string;
  leads: OnboardingLeadSlot[];
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // 1. Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name:       input.name,
      email:           input.email,
      channel:         input.channel,
      phone:           input.phone?.trim() || null,
      nudge_time:      input.nudgeTime + ":00",
      onboarded:       true,
      onboarding_step: 5,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  // 2. Insert leads (only those with a name)
  const validLeads = input.leads
    .filter((l) => l.name.trim().length > 0)
    .map((l) => ({
      user_id: user.id,
      name: l.name.trim(),
      email: l.email.trim() || null,
      note: l.note.trim() || null,
      status: "new" as const,
    }));

  if (validLeads.length > 0) {
    const { error: leadsError } = await supabase
      .from("leads")
      .insert(validLeads);

    if (leadsError) {
      return { error: leadsError.message };
    }
  }

  return { error: null };
}
