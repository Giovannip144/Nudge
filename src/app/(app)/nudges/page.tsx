import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NudgeTestButton } from "@/components/inbox/NudgeTestButton";
import { DigestPreviewButton } from "@/components/inbox/DigestPreviewButton";

export default async function NudgesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logs } = await supabase
    .from("nudge_logs")
    .select("id, created_at, type, message, channel, delivered, error")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: profile } = await supabase
    .from("profiles")
    .select("nudge_time, channel")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-8 max-w-[680px]">
      <h1 className="font-display text-2xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>
        Nudges
      </h1>
      <p className="text-[14px] mb-8" style={{ color:"var(--muted)" }}>
        Daily nudges weekdays at {profile?.nudge_time?.slice(0,5) ?? "08:30"} · Sunday digest at 10:00
      </p>

      {/* ── DAILY NUDGE TEST ── */}
      <div className="rounded-xl p-5 mb-4" style={{ background:"var(--bg2)", border:"1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔔</span>
          <div className="text-[14px] font-semibold" style={{ color:"var(--bright)" }}>Daily morning nudge</div>
        </div>
        <p className="text-[12px] mb-4" style={{ color:"var(--muted)", lineHeight:1.7 }}>
          Sent weekdays at {profile?.nudge_time?.slice(0,5) ?? "08:30"} via {profile?.channel === "whatsapp" ? "WhatsApp" : "email"}. One lead, one reason, one action.
        </p>
        <NudgeTestButton />
      </div>

      {/* ── SUNDAY DIGEST TEST ── */}
      <div className="rounded-xl p-5 mb-8" style={{ background:"var(--bg2)", border:"1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">☀</span>
          <div className="text-[14px] font-semibold" style={{ color:"var(--bright)" }}>Sunday weekly digest</div>
        </div>
        <p className="text-[12px] mb-4" style={{ color:"var(--muted)", lineHeight:1.7 }}>
          Sent every Sunday at 10:00. Claude picks the top 3 leads for the week — with a specific reason and a suggested opening for each.
        </p>
        <DigestPreviewButton />
      </div>

      {/* ── SCHEDULE INFO ── */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        <div className="rounded-lg p-3 flex items-center gap-2.5"
             style={{ background:"rgba(168,240,122,0.05)", border:"1px solid rgba(168,240,122,0.15)" }}>
          <span>⏰</span>
          <div>
            <div className="text-[11px] font-semibold" style={{ color:"var(--accent)" }}>Daily nudge</div>
            <div className="text-[12px]" style={{ color:"var(--muted)" }}>Weekdays · {profile?.nudge_time?.slice(0,5) ?? "08:30"} AM</div>
          </div>
        </div>
        <div className="rounded-lg p-3 flex items-center gap-2.5"
             style={{ background:"rgba(168,240,122,0.05)", border:"1px solid rgba(168,240,122,0.15)" }}>
          <span>📅</span>
          <div>
            <div className="text-[11px] font-semibold" style={{ color:"var(--accent)" }}>Sunday digest</div>
            <div className="text-[12px]" style={{ color:"var(--muted)" }}>Every Sunday · 10:00 AM</div>
          </div>
        </div>
      </div>

      {/* ── HISTORY ── */}
      <div className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-3" style={{ color:"var(--muted)" }}>
        History
      </div>

      {!logs?.length ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-4xl mb-3 opacity-40">🔔</div>
          <h3 className="font-display text-lg font-bold mb-1" style={{ color:"var(--text)" }}>No nudges sent yet</h3>
          <p className="text-[13px] max-w-[260px]" style={{ color:"var(--muted)" }}>
            Use the test buttons above to preview and send your first nudge now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl p-4"
                 style={{ background:"var(--bg2)", border:`1px solid ${log.delivered ? "var(--border)" : "rgba(240,122,122,0.2)"}` }}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-[11px] font-mono" style={{ color:"var(--muted)" }}>
                  {new Date(log.created_at).toLocaleDateString("en-GB", {
                    weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: log.type === "weekly" ? "rgba(168,240,122,0.1)" : "rgba(122,184,240,0.1)",
                          color:      log.type === "weekly" ? "var(--accent)" : "var(--blue)",
                        }}>
                    {log.type === "weekly" ? "☀ Digest" : "🔔 Daily"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: log.channel === "whatsapp" ? "rgba(37,211,102,0.12)" : "rgba(122,184,240,0.12)",
                          color:      log.channel === "whatsapp" ? "#25d366" : "var(--blue)",
                        }}>
                    {log.channel === "whatsapp" ? "WhatsApp" : "Email"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: log.delivered ? "rgba(168,240,122,0.1)" : "rgba(240,122,122,0.1)",
                          color:      log.delivered ? "var(--accent)" : "var(--red)",
                        }}>
                    {log.delivered ? "Delivered" : "Failed"}
                  </span>
                </div>
              </div>
              {log.message ? (
                <p className="text-[13px] leading-relaxed" style={{ color:"var(--text)" }}>
                  {log.message.slice(0, 200)}{log.message.length > 200 ? "…" : ""}
                </p>
              ) : (
                <p className="text-[12px]" style={{ color:"var(--red)" }}>{log.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
