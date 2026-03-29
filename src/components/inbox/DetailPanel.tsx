"use client";

import { useEffect, useState } from "react";
import { getInitials, getAvatarColor, relativeTime, daysSince } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types";

interface ConversationSnippet {
  date: string;
  direction: "sent" | "received";
  snippet: string;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; icon: string }[] = [
  { value: "active",  label: "Active",  icon: "🟢" },
  { value: "warm",    label: "Warm",    icon: "🟡" },
  { value: "new",     label: "New",     icon: "🔵" },
  { value: "won",     label: "Won",     icon: "✅" },
  { value: "paused",  label: "Paused",  icon: "⏸" },
  { value: "lost",    label: "Lost",    icon: "❌" },
];

interface Props {
  lead: (Lead & { days_since_contact?: number }) | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onToast: (icon: string, message: string) => void;
}

export function DetailPanel({ lead, onClose, onUpdate, onDelete, onStatusChange, onToast }: Props) {
  const [note, setNote] = useState(lead?.note ?? "");
  const [name, setName] = useState(lead?.name ?? "");
  const [editingName, setEditingName] = useState(false);

  const [convLoading,  setConvLoading]  = useState(false);
  const [convSnippets, setConvSnippets] = useState<ConversationSnippet[] | null>(null);
  const [convError,    setConvError]    = useState<string | null>(null);
  const [convReason,   setConvReason]   = useState<string | null>(null);

  // Sync when lead changes
  useEffect(() => {
    setNote(lead?.note ?? "");
    setName(lead?.name ?? "");
    setEditingName(false);
    setConvSnippets(null);
    setConvError(null);
    setConvReason(null);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConversations() {
    if (!lead) return;
    setConvLoading(true);
    setConvError(null);
    setConvSnippets(null);
    setConvReason(null);
    try {
      const res  = await fetch(`/api/gmail/conversations?lead_id=${lead.id}`);
      const data = await res.json();
      if (!res.ok) {
        setConvError(data.error ?? "Failed to load");
      } else if (data.reason) {
        setConvReason(data.reason);
      } else {
        setConvSnippets(data.snippets ?? []);
      }
    } catch {
      setConvError("Network error");
    } finally {
      setConvLoading(false);
    }
  }

  if (!lead) return null;

  const color = getAvatarColor(lead.id);
  const days  = lead.days_since_contact ?? daysSince(lead.last_contact_at);

  async function saveNote() {
    if (!lead) return;
    await onUpdate(lead.id, { note });
  }

  async function saveName() {
    if (!lead || !name.trim()) return;
    setEditingName(false);
    await onUpdate(lead.id, { name: name.trim() });
  }

  return (
    <>
      {/* Overlay on mobile */}
      <div
        className="fixed inset-0 z-20 md:hidden"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      <div
        className="fixed top-[54px] right-0 bottom-0 z-30 flex flex-col overflow-y-auto"
        style={{
          width: "clamp(320px, 390px, 95vw)",
          background: "var(--bg2)",
          borderLeft: "1px solid var(--border)",
          transform: "translateX(0)",
          animation: "slideIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>

        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-start gap-3 p-5 pb-4"
          style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}
        >
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl font-bold flex-shrink-0"
            style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.text }}
          >
            {getInitials(lead.name)}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                className="input-base text-base py-1.5 font-semibold"
                style={{ fontSize: 17 }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
              />
            ) : (
              <h2
                className="font-display text-lg font-black tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: "var(--bright)", letterSpacing: "-0.01em" }}
                onClick={() => setEditingName(true)}
                title="Click to edit"
              >
                {lead.name}
              </h2>
            )}
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
              {lead.email || "No email"} · Added {new Date(lead.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--muted)", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">

          {/* Note */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--muted)" }}>Note</div>
            <div
              className="rounded-lg p-3.5 transition-colors"
              style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}
            >
              <textarea
                className="w-full bg-transparent border-none outline-none text-[13px] resize-none min-h-[56px] leading-relaxed placeholder:text-nudge-muted"
                style={{ color: "var(--text)", fontFamily: "DM Sans, sans-serif" }}
                placeholder="One sentence about this lead…"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
              />
              <div className="text-[10px] text-right mt-1" style={{ color: "var(--muted)" }}>
                {note.length} / 500
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--muted)" }}>Status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange(lead.id, opt.value)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all duration-150"
                  style={{
                    background: lead.status === opt.value ? "rgba(168,240,122,0.12)" : "var(--bg3)",
                    border: lead.status === opt.value ? "1px solid rgba(168,240,122,0.3)" : "1px solid var(--border)",
                    color: lead.status === opt.value ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--muted)" }}>Overview</div>
            <div className="grid grid-cols-2 gap-px">
              <div className="p-3 rounded-l-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="font-display text-2xl font-black" style={{ color: "var(--accent)" }}>{days}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>days since last contact</div>
              </div>
              <div className="p-3 rounded-r-lg" style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div className="font-display text-2xl font-black" style={{ color: "var(--bright)" }}>
                  {new Date(lead.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>date added</div>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--muted)" }}>Activity</div>
            <div className="flex flex-col">
              {days >= 7 && (
                <TimelineItem color="var(--red)" time="Today">
                  <strong style={{ color: "var(--text)" }}>Nudge active</strong> — {days} days of silence
                </TimelineItem>
              )}
              <TimelineItem color="var(--accent)" time={lead.last_contact_at ? relativeTime(lead.last_contact_at) : "Never"}>
                <strong style={{ color: "var(--text)" }}>Last email contact</strong>
              </TimelineItem>
              <TimelineItem color="var(--blue)" time={new Date(lead.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}>
                <strong style={{ color: "var(--text)" }}>Lead added</strong> to inbox
              </TimelineItem>
            </div>
          </div>

          {/* Gmail conversation history */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: "var(--muted)" }}>Gmail history</div>
              {!convSnippets && !convLoading && (
                <button
                  onClick={loadConversations}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all"
                  style={{ background: "rgba(168,240,122,0.08)", border: "1px solid rgba(168,240,122,0.2)", color: "var(--accent)", cursor: "pointer" }}
                >
                  Load
                </button>
              )}
              {convSnippets && (
                <button
                  onClick={loadConversations}
                  className="text-[11px]"
                  style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  🔄 Refresh
                </button>
              )}
            </div>

            {convLoading && (
              <div className="flex items-center gap-2 py-3 text-[12px]" style={{ color: "var(--muted)" }}>
                <span className="w-3 h-3 rounded-full border-2 animate-spin inline-block" style={{ borderColor: "rgba(168,240,122,0.3)", borderTopColor: "var(--accent)" }} />
                Fetching from Gmail…
              </div>
            )}

            {convError && (
              <p className="text-[12px]" style={{ color: "var(--red)" }}>❌ {convError}</p>
            )}

            {convReason === "no_email" && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>No email address on this lead — add one to enable Gmail history.</p>
            )}

            {convReason === "gmail_not_connected" && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>Gmail not connected. Go to <a href="/settings" style={{ color: "var(--accent)", textDecoration: "underline" }}>Settings</a> to connect.</p>
            )}

            {convReason === "gmail_token_expired" && (
              <p className="text-[12px]" style={{ color: "var(--amber)" }}>Gmail access expired. Go to <a href="/settings" style={{ color: "var(--accent)", textDecoration: "underline" }}>Settings</a> and reconnect Gmail.</p>
            )}

            {convSnippets !== null && convSnippets.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>No emails found with this lead in Gmail.</p>
            )}

            {convSnippets && convSnippets.length > 0 && (
              <div className="flex flex-col gap-2">
                {[...convSnippets]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{
                        background: "var(--bg3)",
                        border: `1px solid ${s.direction === "sent" ? "rgba(168,240,122,0.15)" : "rgba(122,184,240,0.15)"}`,
                        borderLeft: `3px solid ${s.direction === "sent" ? "var(--accent)" : "var(--blue)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold" style={{ color: s.direction === "sent" ? "var(--accent)" : "var(--blue)" }}>
                          {s.direction === "sent" ? "↑ You" : "↓ Lead"}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--muted)" }}>{s.date}</span>
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>
                        {s.snippet}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "var(--muted)" }}>Actions</div>
            <div className="flex flex-col gap-2">
              <ActionButton icon="✉️" primary onClick={() => onToast("✉️", "AI draft coming in Week 3!")}>
                Write follow-up (AI draft)
              </ActionButton>
              <ActionButton icon="🔔" onClick={() => { onUpdate(lead.id, { snooze_until: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }); onToast("🔔", "Nudge snoozed for 3 days"); }}>
                Snooze nudge — 3 days
              </ActionButton>
              <ActionButton icon="✅" onClick={() => { onStatusChange(lead.id, "won"); onClose(); onToast("🎉", "Lead marked as won!"); }}>
                Mark as won
              </ActionButton>
              <ActionButton icon="🗑️" danger onClick={() => { if (confirm(`Remove ${lead.name}?`)) onDelete(lead.id); }}>
                Remove lead
              </ActionButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function TimelineItem({ color, time, children }: { color: string; time: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="text-[12px] leading-relaxed flex-1" style={{ color: "var(--muted)" }}>{children}</div>
      <div className="text-[10px] flex-shrink-0" style={{ color: "var(--muted)" }}>{time}</div>
    </div>
  );
}

function ActionButton({
  icon, children, primary, danger, onClick,
}: {
  icon: string; children: React.ReactNode;
  primary?: boolean; danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
      style={{
        background: primary ? "rgba(168,240,122,0.1)" : "var(--bg3)",
        border: primary ? "1px solid rgba(168,240,122,0.25)" : "1px solid var(--border)",
        color: primary ? "var(--accent)" : danger ? "var(--red)" : "var(--text)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (danger) el.style.background = "rgba(240,122,122,0.08)";
        else if (!primary) el.style.background = "var(--bg4)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = primary ? "rgba(168,240,122,0.1)" : "var(--bg3)";
      }}
    >
      <span className="text-[14px] w-[18px] text-center">{icon}</span>
      {children}
    </button>
  );
}
