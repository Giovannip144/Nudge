# nudge. — Your AI client memory

> Stop losing clients to forgotten follow-ups.

---

## MVP Roadmap

| Week | What gets built | Status |
|------|----------------|--------|
| **1** | Auth + DB + Lead Inbox | ✅ Done |
| **2** | Gmail OAuth + last-contact auto-detection | ✅ Done |
| **3** | Claude AI nudges + daily email delivery | ✅ Done |
| 4 | WhatsApp delivery via Twilio | 🔜 |
| 5 | Stripe payments + tier limits | 🔜 |
| 6 | Public launch | 🔜 |

---

## Project Structure

```
nudge/
├── vercel.json                          # 2 cron jobs: Gmail scan (06:30) + nudge (08:30 weekdays)
├── supabase/schema.sql
│
├── src/
│   ├── app/
│   │   ├── (auth)/login/ + auth/callback/
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── onboarding/
│   │   │   ├── inbox/
│   │   │   ├── nudges/page.tsx          # ← Updated W3: history + test button
│   │   │   └── settings/
│   │   └── api/
│   │       ├── leads/
│   │       ├── gmail/connect|callback|scan|disconnect/
│   │       ├── nudge/
│   │       │   └── generate/route.ts   # ← NEW W3: preview + manual send
│   │       └── cron/
│   │           ├── daily-scan/         # W2: Gmail scan 06:30
│   │           └── morning-nudge/      # ← NEW W3: AI nudge 08:30 weekdays
│   │
│   ├── components/
│   │   ├── inbox/
│   │   │   ├── InboxClient, LeadRow, DetailPanel, AddLeadModal
│   │   │   ├── GmailConnectButton.tsx
│   │   │   └── NudgeTestButton.tsx     # ← NEW W3: preview + send in Settings
│   │   ├── layout/ + onboarding/ + ui/
│   │
│   └── lib/
│       ├── claude.ts                   # ← NEW W3: Claude API nudge generation
│       ├── resend.ts                   # ← NEW W3: Email delivery
│       ├── nudge-runner.ts             # ← NEW W3: Core nudge logic (shared)
│       ├── gmail.ts
│       ├── utils.ts
│       └── supabase/
```

---

## Setup — Weeks 1 + 2 + 3

### Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google (login + Gmail)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CRON_SECRET=...

# Week 3 — new
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### Week 3 specific setup

**1. Get your Anthropic API key**
- Go to [console.anthropic.com](https://console.anthropic.com) → API Keys → Create key
- Add as `ANTHROPIC_API_KEY` in `.env.local`

**2. Set up Resend**
- Go to [resend.com](https://resend.com) → sign up free
- API Keys → Create key → add as `RESEND_API_KEY`
- Domains → Add domain → verify your domain (or use `onboarding@resend.dev` for testing)
- Update the `from` field in `src/lib/resend.ts` to match your verified domain

**3. Run the app**
```bash
npm run dev
```

---

## How the daily nudge works

```
08:30 AM weekdays — Vercel Cron fires GET /api/cron/morning-nudge
       ↓
Fetch all onboarded users from Supabase
       ↓
For each user:
  1. Fetch their active leads + last_contact_at dates
  2. Pick the most stale lead (most days without contact)
  3. Build context: name + note + days of silence
  4. Call Claude API → generates 2–3 sentence personalised message
  5. Send via Resend (email) or Twilio (WhatsApp — Week 4)
  6. Log to nudge_logs table (delivered + message stored)
       ↓
User receives email at 08:30 with one specific lead + one action
```

---

## Testing locally (without waiting for cron)

### Preview today's nudge (no email sent):
Settings page → "Test your nudge" → "Preview today's nudge"

### Actually send the email now:
Settings page → "Test your nudge" → "Preview" → "Send now"

### Via curl:
```bash
# Preview (no send)
curl -X POST http://localhost:3000/api/nudge/generate \
  -H "Content-Type: application/json" \
  -b "your-session-cookie" \
  -d '{"send": false}'

# Send immediately
curl -X POST http://localhost:3000/api/nudge/generate \
  -H "Content-Type: application/json" \
  -b "your-session-cookie" \
  -d '{"send": true}'
```

---

## Week 4 — What gets added next

- Twilio WhatsApp Business API integration
- WhatsApp template message approval (Meta)
- `src/lib/twilio.ts` delivery module
- Users who chose WhatsApp in onboarding get messages via +31 number instead of email
