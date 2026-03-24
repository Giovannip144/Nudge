"use client";

import { useState } from "react";

export function NudgeTestButton() {
  const [loading,  setLoading]  = useState(false);
  const [preview,  setPreview]  = useState<null | { lead: string; subject: string; message: string; urgency: string }>(null);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handlePreview() {
    setLoading(true);
    setPreview(null);
    setError(null);
    setSent(false);

    try {
      const res  = await fetch("/api/nudge/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ send: false }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate preview");
      } else {
        setPreview(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res  = await fetch("/api/nudge/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ send: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Send failed");
      } else {
        setSent(true);
        setPreview(null);
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  const urgencyColor = (u: string) =>
    u === "high" ? "var(--red)" : u === "medium" ? "var(--amber)" : "var(--accent)";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all"
          style={{
            background: "rgba(168,240,122,0.1)",
            border:     "1px solid rgba(168,240,122,0.25)",
            color:      loading ? "var(--muted)" : "var(--accent)",
            cursor:     loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                    style={{ borderColor: "rgba(168,240,122,0.3)", borderTopColor: "var(--accent)" }} />
              Generating…
            </>
          ) : "🔍 Preview today's nudge"}
        </button>

        {preview && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all"
            style={{
              background: "var(--accent)",
              color:      "#0c0c0a",
              border:     "none",
              cursor:     sending ? "not-allowed" : "pointer",
              opacity:    sending ? 0.6 : 1,
            }}
          >
            {sending ? "Sending…" : "✉️ Send now"}
          </button>
        )}
      </div>

      {/* Preview card */}
      {preview && (
        <div className="rounded-xl p-4 relative overflow-hidden"
             style={{ background: "var(--bg3)", border: `1px solid ${urgencyColor(preview.urgency)}40` }}>
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background: `linear-gradient(90deg,transparent,${urgencyColor(preview.urgency)}60,transparent)` }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase"
                  style={{ color: urgencyColor(preview.urgency) }}>
              🔔 {preview.lead}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded ml-auto"
                  style={{ background: `${urgencyColor(preview.urgency)}15`, color: urgencyColor(preview.urgency) }}>
              {preview.urgency} urgency
            </span>
          </div>
          <p className="text-[12px] mb-2" style={{ color: "var(--muted)" }}>
            Subject: <span style={{ color: "var(--text)" }}>{preview.subject}</span>
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
            {preview.message}
          </p>
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <p className="text-[13px]" style={{ color: "var(--accent)" }}>
          ✅ Nudge sent to your email — check your inbox.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[12px]" style={{ color: "var(--red)" }}>❌ {error}</p>
      )}
    </div>
  );
}
