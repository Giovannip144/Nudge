// ══════════════════════════════════════════════════════════════
// NUDGE — Claude API Integration
// Generates contextual nudge messages based on lead data
// AND real conversation snippets from Gmail.
// ══════════════════════════════════════════════════════════════

import type { ConversationContext } from "./gmail";

export interface LeadContext {
  name:             string;
  note:             string | null;
  daysSinceContact: number;
  lastContactDate:  string | null;
  status:           string;
  conversation?:    ConversationContext; // ← NEW: real email context
}

export interface NudgeMessage {
  subject:  string;
  body:     string;
  leadName: string;
  urgency:  "high" | "medium" | "low";
  hasConversationContext: boolean; // ← so we know if it was contextual
}

// ─── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Nudge, an AI assistant that helps freelancers follow up with clients and leads.

Your job: write a short, warm, actionable morning message telling the freelancer who to reach out to today and why.

Rules:
- Maximum 3 sentences. Never more.
- Sound like a thoughtful colleague, not a CRM reminder.
- When conversation snippets are available, reference what was ACTUALLY discussed — be specific.
- When there are no snippets, use the note and silence duration to suggest a relevant check-in.
- End with one concrete suggested action — make it feel natural, not scripted.
- Never use corporate jargon, exclamation marks, or phrases like "Don't forget to" or "Make sure to".
- Never say "I noticed" or "According to my data" — just state it naturally.
- Write in English unless the note is clearly in another language.

The difference between a good nudge and a bad one:
BAD: "You haven't contacted Daan in 21 days. Consider following up."
GOOD: "Daan asked about your September availability three weeks ago and you haven't replied — a quick message today could secure that Q4 project."

Output format: plain text only. No markdown, no bullet points, no subject line.`;

// ─── Pick the best lead to nudge today ───────────────────────
export function pickLeadToNudge(leads: LeadContext[]): LeadContext | null {
  if (!leads.length) return null;

  const eligible = leads.filter(
    (l) => l.status !== "won" && l.status !== "paused" && l.status !== "lost"
  );
  if (!eligible.length) return null;

  const stale = eligible
    .filter((l) => l.daysSinceContact >= 3)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  return stale[0] ?? null;
}

// ─── Generate nudge via Claude API ───────────────────────────
export async function generateNudgeMessage(
  userName: string,
  lead:      LeadContext
): Promise<NudgeMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const hasConversationContext = !!lead.conversation?.snippets.length;
  const userPrompt = buildUserPrompt(userName, lead);

  console.log(`🤖 Generating nudge for ${lead.name} — context: ${hasConversationContext ? `${lead.conversation!.snippets.length} snippets` : "note only"}`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 250,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const body = data.content?.[0]?.text?.trim() ?? "";
  if (!body) throw new Error("Claude returned empty response");

  const urgency: NudgeMessage["urgency"] =
    lead.daysSinceContact >= 21 ? "high"   :
    lead.daysSinceContact >= 10 ? "medium" : "low";

  return {
    subject:               buildSubject(lead, urgency),
    body,
    leadName:              lead.name,
    urgency,
    hasConversationContext,
  };
}

// ─── Build the user prompt ────────────────────────────────────
function buildUserPrompt(userName: string, lead: LeadContext): string {
  const lines: string[] = [
    `Freelancer: ${userName}`,
    `Lead name: ${lead.name}`,
    `Days since last contact: ${lead.daysSinceContact}`,
    `Last contacted: ${lead.lastContactDate ?? "never"}`,
  ];

  if (lead.note) {
    lines.push(`Note about this lead: ${lead.note}`);
  }

  // ── Conversation context ──────────────────────────────────
  const snippets = lead.conversation?.snippets;
  if (snippets?.length) {
    lines.push("");
    lines.push(`Recent email conversation (${snippets.length} messages, oldest first):`);

    // Sort oldest → newest so Claude reads the conversation chronologically
    const sorted = [...snippets].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const s of sorted) {
      const who = s.direction === "sent" ? `${userName} wrote` : `${lead.name} wrote`;
      lines.push(`[${s.date}] ${who}: "${s.snippet}"`);
    }

    lines.push("");
    lines.push(
      `Based on this conversation, write a specific and contextual morning nudge for ${userName} about following up with ${lead.name}. ` +
      `Reference what was actually discussed — don't be generic.`
    );
  } else {
    lines.push("");
    lines.push(
      `No email conversation available. Write a morning nudge for ${userName} about following up with ${lead.name} ` +
      `based on the note and the ${lead.daysSinceContact} days of silence.`
    );
  }

  return lines.join("\n");
}

// ─── Build email subject ──────────────────────────────────────
function buildSubject(lead: LeadContext, urgency: NudgeMessage["urgency"]): string {
  if (urgency === "high")   return `Time to reach out to ${lead.name} — ${lead.daysSinceContact} days of silence`;
  if (urgency === "medium") return `${lead.name} hasn't heard from you in ${lead.daysSinceContact} days`;
  return `Your morning nudge — follow up with ${lead.name}`;
}

// ══════════════════════════════════════════════════════════════
// SUNDAY DIGEST
// Generates a prioritised weekly list of 3 leads to contact.
// ══════════════════════════════════════════════════════════════

export interface DigestLead {
  name:             string;
  note:             string | null;
  daysSinceContact: number;
  lastContactDate:  string | null;
  status:           string;
  email:            string | null;
}

export interface DigestEntry {
  name:       string;   // Lead name
  reason:     string;   // Why now (1 sentence)
  opening:    string;   // Suggested opening line
  urgency:    "high" | "medium" | "low";
}

export interface DigestMessage {
  subject:  string;
  intro:    string;           // 1 sentence intro
  entries:  DigestEntry[];    // Max 3
  outro:    string;           // 1 closing sentence
}

const DIGEST_SYSTEM_PROMPT = `You are Nudge, an AI assistant that helps freelancers prioritise their client relationships.

Your job: generate a Sunday morning weekly digest — a list of exactly 3 leads to reach out to this week.

For each lead, provide:
1. "reason": one specific sentence explaining WHY this week is the right moment (not just "you haven't spoken in X days")
2. "opening": one concrete suggested opening line for the message — make it feel natural and personal

Ranking logic (apply in this order):
1. Leads with open proposals or quotes mentioned in notes — highest priority
2. Leads with seasonal relevance (Q4 budgets Oct-Dec, new year resolutions Jan, post-summer Sep, pre-summer May-Jun)
3. Leads with the longest silence who are not won/paused/lost
4. Leads where the note suggests a time-sensitive context

Rules:
- Be specific — reference what you actually know about each lead from their note
- The reason must feel like something a smart colleague would say, not a CRM alert
- The opening suggestion should be a real first sentence they can copy-paste
- Never say "I noticed" or "According to the data"
- Never use exclamation marks or corporate language
- Write in English unless the note is in another language

Output: valid JSON only. No markdown, no explanation outside the JSON.

Format:
{
  "intro": "One sentence framing this week's priorities.",
  "entries": [
    {
      "name": "Lead Name",
      "reason": "One specific sentence explaining why this week.",
      "opening": "Suggested opening line they can send.",
      "urgency": "high|medium|low"
    }
  ],
  "outro": "One closing sentence — encouraging but not cheesy."
}`;

// ─── Generate Sunday digest via Claude ───────────────────────
export async function generateSundayDigest(
  userName: string,
  leads:    DigestLead[]
): Promise<DigestMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  if (!leads.length) throw new Error("No leads to generate digest for");

  const today     = new Date();
  const month     = today.getMonth() + 1; // 1-12
  const weekNum   = getWeekNumber(today);
  const season    = getSeason(month);

  const userPrompt = buildDigestPrompt(userName, leads, season, month, weekNum);

  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 600,
        system:     DIGEST_SYSTEM_PROMPT,
        messages:   [{ role: "user", content: userPrompt }],
      }),
    });

    if (response.ok) break;
    lastError = await response.text();
    if (response.status !== 529) throw new Error(`Claude API error ${response.status}: ${lastError}`);
    const waitMs = attempt * 2000;
    console.warn(`⏳ Claude overloaded (attempt ${attempt}/3) — retrying in ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  if (!response?.ok) throw new Error(`Claude API error after 3 retries: ${lastError}`);

  const data    = await response.json();
  const rawText = data.content?.[0]?.text?.trim() ?? "";
  if (!rawText) throw new Error("Claude returned empty response");

  // Parse JSON — strip markdown fences if present
  const clean   = rawText.replace(/```json\n?|```/g, "").trim();
  const parsed  = JSON.parse(clean);

  return {
    subject: buildDigestSubject(parsed.entries ?? []),
    intro:   parsed.intro ?? "",
    entries: (parsed.entries ?? []).slice(0, 3),
    outro:   parsed.outro ?? "",
  };
}

// ─── Build the digest prompt ──────────────────────────────────
function buildDigestPrompt(
  userName: string,
  leads:    DigestLead[],
  season:   string,
  month:    number,
  weekNum:  number
): string {
  const lines = [
    `Freelancer: ${userName}`,
    `Today: ${new Date().toISOString().slice(0, 10)} (week ${weekNum}, ${season})`,
    `Current month: ${month} — use this for seasonal context`,
    "",
    `Active leads (${leads.length} total):`,
  ];

  for (const l of leads) {
    lines.push(`\nLead: ${l.name}`);
    lines.push(`  Status: ${l.status}`);
    lines.push(`  Days since last contact: ${l.daysSinceContact}`);
    lines.push(`  Last contacted: ${l.lastContactDate ?? "never"}`);
    if (l.note) lines.push(`  Note: ${l.note}`);
    else        lines.push(`  Note: (none)`);
  }

  lines.push("");
  lines.push(`Pick the top 3 leads ${userName} should contact this week. Exclude won, paused, and lost leads.`);
  lines.push("Return valid JSON only.");

  return lines.join("\n");
}

function buildDigestSubject(entries: DigestEntry[]): string {
  if (!entries.length) return "Your weekly Nudge digest";
  const names = entries.slice(0, 2).map((e) => e.name).join(" and ");
  return `This week: reach out to ${names}${entries.length > 2 ? ` (+1 more)` : ""}`;
}

function getWeekNumber(date: Date): number {
  const start  = new Date(date.getFullYear(), 0, 1);
  const diff   = date.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function getSeason(month: number): string {
  if ([12, 1, 2].includes(month))  return "winter (Q4 budgets closing / new year energy)";
  if ([3, 4, 5].includes(month))   return "spring (projects ramping up)";
  if ([6, 7, 8].includes(month))   return "summer (slower pace, good for check-ins)";
  return "autumn (Q4 budgets opening, high decision-making activity)";
}
