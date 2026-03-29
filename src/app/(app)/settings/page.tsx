import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GmailConnectButton } from "@/components/inbox/GmailConnectButton";
import { ChannelSettings } from "@/components/inbox/ChannelSettings";

interface Props {
  searchParams: Promise<{ gmail?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, channel, phone, nudge_time, gmail_connected, tier")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("archived_at", null);

  const { gmail: gmailStatus } = await searchParams;

  return (
    <div className="p-8 max-w-[640px]">
      <h1 className="font-display text-2xl font-black tracking-tight mb-6" style={{ color:"var(--bright)" }}>
        Settings
      </h1>

      {gmailStatus === "connected" && (
        <div className="rounded-xl px-4 py-3 mb-5 text-[13px]" style={{ background:"rgba(168,240,122,0.08)", border:"1px solid rgba(168,240,122,0.25)", color:"var(--accent)" }}>
          ✅ Gmail connected — your leads will be scanned automatically every day.
        </div>
      )}
      {gmailStatus === "denied" && (
        <div className="rounded-xl px-4 py-3 mb-5 text-[13px]" style={{ background:"rgba(240,201,122,0.08)", border:"1px solid rgba(240,201,122,0.2)", color:"var(--amber)" }}>
          ⚠ Gmail access was not granted. You can connect it any time below.
        </div>
      )}
      {gmailStatus === "error" && (
        <div className="rounded-xl px-4 py-3 mb-5 text-[13px]" style={{ background:"rgba(240,122,122,0.08)", border:"1px solid rgba(240,122,122,0.2)", color:"var(--red)" }}>
          ❌ Something went wrong. Please try connecting Gmail again.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          { label:"Name",       value: profile?.full_name || "—" },
          { label:"Email",      value: profile?.email || user.email || "—" },
          { label:"Channel",    value: profile?.channel === "whatsapp" ? "💬 WhatsApp" : "📧 Email" },
          { label:"Nudge time", value: (profile?.nudge_time?.slice(0,5) || "08:30") + " AM" },
          { label:"Plan",       value: profile?.tier === "free" ? "Free (0–10 leads)" : "Starter" },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4" style={{ background:"var(--bg2)", border:"1px solid var(--border)" }}>
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1" style={{ color:"var(--muted)" }}>{item.label}</div>
            <div className="text-[14px] font-medium" style={{ color:"var(--bright)" }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Gmail section */}
      <div className="rounded-xl p-5 mb-5" style={{ background:"var(--bg2)", border:"1px solid var(--border)" }}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-[14px] font-semibold mb-1" style={{ color:"var(--bright)" }}>Gmail connection</div>
            <p className="text-[12px] mb-3" style={{ color:"var(--muted)", lineHeight:1.7 }}>
              {profile?.gmail_connected
                ? "Nudge scans your Gmail every day at 06:30 AM to auto-detect when you last emailed a lead. Read-only — we never store email content."
                : "Connect Gmail so Nudge can automatically detect when you last contacted each lead. Read-only access — we never store email content, only dates."}
            </p>
            <div className="flex items-center gap-2 mb-4 text-[11px] rounded-lg px-3 py-2 w-fit" style={{ background:"rgba(122,184,240,0.08)", border:"1px solid rgba(122,184,240,0.18)", color:"var(--blue)" }}>
              🔒 Read-only · No email content stored · Only contact dates
            </div>
            <GmailConnectButton isConnected={profile?.gmail_connected ?? false} />
          </div>
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: profile?.gmail_connected ? "rgba(168,240,122,0.12)" : "rgba(255,255,255,0.04)", border: profile?.gmail_connected ? "1px solid rgba(168,240,122,0.25)" : "1px solid var(--border)" }}>
            {profile?.gmail_connected ? "✅" : "📧"}
          </div>
        </div>
      </div>

      {/* Notification channel — email or WhatsApp */}
      <ChannelSettings
        currentChannel={(profile?.channel as "email" | "whatsapp") ?? "email"}
        currentPhone={profile?.phone ?? ""}
      />

      {/* Lead usage */}
      <div className="rounded-xl p-4 mb-6" style={{ background:"var(--bg2)", border:"1px solid var(--border)" }}>
        <div className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-2" style={{ color:"var(--muted)" }}>Lead usage</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"var(--bg3)" }}>
            <div className="h-full rounded-full" style={{ width:`${Math.min(((count||0)/10)*100,100)}%`, background:(count||0)>=10?"var(--amber)":"var(--accent)" }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color:"var(--text)" }}>{count||0} / 10</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-4" style={{ background:"rgba(240,122,122,0.05)", border:"1px solid rgba(240,122,122,0.15)" }}>
        <div className="text-[13px] font-semibold mb-1" style={{ color:"var(--red)" }}>Sign out</div>
        <p className="text-[12px] mb-3" style={{ color:"var(--muted)" }}>You will be redirected to the login page.</p>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="text-[12px] font-semibold px-4 py-2 rounded-lg cursor-pointer" style={{ background:"rgba(240,122,122,0.1)", border:"1px solid rgba(240,122,122,0.2)", color:"var(--red)" }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
