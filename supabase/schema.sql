-- ══════════════════════════════════════════════════════════════
-- NUDGE — Supabase Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extended user data beyond what Supabase Auth provides.
-- One row per authenticated user, created automatically on signup.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  email             text        not null,
  full_name         text,
  avatar_url        text,

  -- Onboarding state
  onboarded         boolean     not null default false,
  onboarding_step   integer     not null default 0,   -- 0=start, 5=complete

  -- Notification preferences (Week 4)
  channel           text        not null default 'email' check (channel in ('email', 'whatsapp')),
  phone             text,                              -- Required if channel = 'whatsapp'
  nudge_time        time        not null default '08:30:00',

  -- Gmail OAuth tokens (Week 2)
  gmail_access_token  text,
  gmail_refresh_token text,
  gmail_connected     boolean   not null default false,

  -- Subscription (Week 5)
  stripe_customer_id  text,
  tier              text        not null default 'free' check (tier in ('free', 'starter', 'pro')),
  tier_expires_at   timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profile data, one row per Supabase auth user.';

-- ─────────────────────────────────────────────────────────────
-- TABLE: leads
-- The core entity. One row per lead per user.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,

  -- Core fields (kept intentionally minimal — see philosophy)
  name              text        not null check (char_length(name) >= 1 and char_length(name) <= 100),
  email             text,                              -- Optional, used for Gmail matching (Week 2)
  note              text        check (char_length(note) <= 500),

  -- Status
  status            text        not null default 'new'
                    check (status in ('new', 'active', 'warm', 'won', 'paused', 'lost')),

  -- Contact tracking (auto-populated via Gmail in Week 2, manual until then)
  last_contact_at   date,
  last_contact_type text        check (last_contact_type in ('email', 'whatsapp', 'call', 'meeting', 'manual')),

  -- Nudge control
  snooze_until      date,                              -- If set, suppress nudges until this date
  nudge_active      boolean     not null default true,

  -- Soft delete
  archived_at       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.leads is 'Client leads managed by a freelancer. Intentionally minimal fields.';

-- ─────────────────────────────────────────────────────────────
-- TABLE: nudge_logs
-- Audit trail of every nudge sent. Used for analytics + retry logic.
-- Added in Week 3 — schema defined now for forward compatibility.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.nudge_logs (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  lead_id           uuid        references public.leads(id) on delete set null,

  type              text        not null check (type in ('daily', 'weekly')),
  channel           text        not null check (channel in ('email', 'whatsapp')),
  message           text        not null,              -- The generated message text
  leads_flagged     uuid[]      default '{}',          -- All lead IDs mentioned in this nudge

  delivered         boolean     not null default false,
  delivered_at      timestamptz,
  error             text,                              -- Error message if delivery failed

  created_at        timestamptz not null default now()
);

comment on table public.nudge_logs is 'Audit log of every AI nudge sent. Powers retry logic and analytics.';

-- ─────────────────────────────────────────────────────────────
-- TABLE: gmail_cache
-- Stores last-email-date per lead (NOT email content — privacy by design).
-- Added in Week 2 — schema defined now.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.gmail_cache (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  lead_id           uuid        not null references public.leads(id) on delete cascade,

  last_email_date   date,
  direction         text        check (direction in ('sent', 'received', 'both')),
  -- NOTE: We NEVER store subject, body, or any email content. Only dates.

  scanned_at        timestamptz not null default now(),

  unique (user_id, lead_id)     -- One cache entry per lead per user
);

comment on table public.gmail_cache is 'Last email date per lead. NEVER stores email content — only metadata dates.';

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Every user can ONLY access their own data. This is enforced at
-- the database level — not just in application code.
-- ══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles    enable row level security;
alter table public.leads       enable row level security;
alter table public.nudge_logs  enable row level security;
alter table public.gmail_cache enable row level security;

-- ── profiles policies ──────────────────────────────────────
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── leads policies ─────────────────────────────────────────
create policy "Users can read their own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own leads"
  on public.leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own leads"
  on public.leads for delete
  using (auth.uid() = user_id);

-- ── nudge_logs policies ────────────────────────────────────
create policy "Users can read their own nudge logs"
  on public.nudge_logs for select
  using (auth.uid() = user_id);

-- ── gmail_cache policies ───────────────────────────────────
create policy "Users can read their own Gmail cache"
  on public.gmail_cache for select
  using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Auto-create profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger: fire after every new user insert in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger leads_updated_at
  before update on public.leads
  for each row execute procedure public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- Performance optimizations for common query patterns.
-- ══════════════════════════════════════════════════════════════

create index if not exists idx_leads_user_id
  on public.leads(user_id);

create index if not exists idx_leads_user_status
  on public.leads(user_id, status)
  where archived_at is null;

create index if not exists idx_leads_user_last_contact
  on public.leads(user_id, last_contact_at)
  where archived_at is null;

create index if not exists idx_nudge_logs_user_id
  on public.nudge_logs(user_id, created_at desc);

create index if not exists idx_gmail_cache_user_lead
  on public.gmail_cache(user_id, lead_id);

-- ══════════════════════════════════════════════════════════════
-- WEEK 5 ADDITIONS — Stripe + Trial management
-- Run these in Supabase SQL Editor after the initial schema
-- ══════════════════════════════════════════════════════════════

-- Add trial + billing fields to profiles
alter table public.profiles
  add column if not exists trial_started_at  timestamptz default now(),
  add column if not exists trial_ends_at     timestamptz default (now() + interval '14 days'),
  add column if not exists stripe_subscription_id   text,
  add column if not exists stripe_subscription_status text default 'trialing'
    check (stripe_subscription_status in (
      'trialing','active','past_due','canceled','unpaid','paused'
    )),
  add column if not exists subscription_paused_at   timestamptz,
  add column if not exists pause_notified_at         timestamptz;

-- Index for cron job that checks expired trials
create index if not exists idx_profiles_trial_ends
  on public.profiles(trial_ends_at)
  where stripe_subscription_status = 'trialing';

-- Index for past_due reminders
create index if not exists idx_profiles_past_due
  on public.profiles(stripe_subscription_status)
  where stripe_subscription_status in ('past_due','unpaid');

-- ══════════════════════════════════════════════════════════════
-- WEEK 5 MIGRATION — Stripe subscription columns
-- Run this in Supabase SQL Editor if you already ran the Week 1 schema.
-- ══════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists stripe_subscription_id     text,
  add column if not exists stripe_subscription_status text default 'trialing'
    check (stripe_subscription_status in ('trialing','active','past_due','unpaid','canceled','paused','incomplete','incomplete_expired')),
  add column if not exists trial_ends_at              timestamptz default (now() + interval '14 days'),
  add column if not exists subscription_paused_at     timestamptz,
  add column if not exists pause_notified_at          timestamptz;

-- Index for trial checks
create index if not exists idx_profiles_subscription_status
  on public.profiles(stripe_subscription_status);

create index if not exists idx_profiles_trial_ends
  on public.profiles(trial_ends_at)
  where stripe_subscription_status = 'trialing';
