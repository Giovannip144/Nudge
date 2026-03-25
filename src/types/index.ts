// ══════════════════════════════════════════════════════════════
// NUDGE — Shared TypeScript Types
// ══════════════════════════════════════════════════════════════

// ─── Database row types (mirror Supabase schema) ──────────────

export type LeadStatus = "new" | "active" | "warm" | "won" | "paused" | "lost" | "urgent";
export type NotificationChannel = "email" | "whatsapp";
export type UserTier = "free" | "starter" | "pro";
export type NudgeType = "daily" | "weekly";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  onboarding_step: number;
  channel: NotificationChannel;
  phone: string | null;
  nudge_time: string; // "HH:MM:SS"
  gmail_connected: boolean;
  stripe_customer_id: string | null;
  tier: UserTier;
  tier_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  note: string | null;
  status: LeadStatus;
  last_contact_at: string | null; // ISO date string "YYYY-MM-DD"
  last_contact_type: string | null;
  snooze_until: string | null;
  nudge_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface NudgeLog {
  id: string;
  user_id: string;
  lead_id: string | null;
  type: NudgeType;
  channel: NotificationChannel;
  message: string;
  leads_flagged: string[];
  delivered: boolean;
  delivered_at: string | null;
  error: string | null;
  created_at: string;
}

// ─── API request/response types ───────────────────────────────

export interface CreateLeadInput {
  name: string;
  email?: string;
  note?: string;
  status?: LeadStatus;
}

export interface UpdateLeadInput {
  name?: string;
  email?: string | null;
  note?: string | null;
  status?: LeadStatus;
  last_contact_at?: string | null;
  snooze_until?: string | null;
  nudge_active?: boolean;
}


export interface UpdateProfileInput {
  full_name?: string;
  channel?: NotificationChannel;
  phone?: string;
  nudge_time?: string;
  onboarded?: boolean;
  onboarding_step?: number;
}

// ─── UI-only types ────────────────────────────────────────────

export interface LeadWithDaysAgo extends Lead {
  days_since_contact: number; // Computed client-side
}

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface OnboardingLeadSlot {
  name: string;
  email: string;
  note: string;
}

export interface ToastOptions {
  icon: string;
  message: string;
  duration?: number;
}

// ─── API response wrapper ─────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
