"use client";

import { useState } from "react";

interface DigestEntry {
  name:    string;
  reason:  string;
  opening: string;
  urgency: "high" | "medium" | "low";
}

interface DigestPreview {
  subject:  string;
  intro:    string;
  entries:  DigestEntry[];
  outro:    string;
  leadsIn:  number;
}

const urgencyColor = (u: string) =>
  u === "high"   ? "var(--red)"   :
  u === "medium" ? "var(--amber)" : "var(--accent)";

const urgencyBorder = (u: string) =>
  u === "high"   ? "rgba(240,122,122,0.35)"   :
  u === "medium" ? "rgba(240,201,122,0.35)"    : "rgba(168,240,122,0.35)";

export function DigestPreviewButton() {
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [preview,  setPreview]  = useState<DigestPreview | null>(null);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handlePreview() {
    setLoading(true);
    setPreview(null);
    setError(null);
    setSent(false);

    try {
      const res  = await fetch("/api/nudge/digest-preview", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ send: false }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to generate digest");
      else         setPreview(data);
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
      const res  = await fetch("/api/nudge/digest-preview", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ send: true }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Send failed");
      else { setSent(true); setPreview(null); }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Action buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
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
                    style={{ borderColor:"rgba(168,240,122,0.3)", borderTopColor:"var(--accent)" }} />
              Generating…
            </>
          ) : "☀ Preview this week's digest"}
        </button>

        {preview && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all"
            style={{
              background: "var(--accent)", color: "#0c0c0a",
              border: "none", cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? "Sending…" : "✉️ Send to my email"}
          </button>
        )}
      </div>

      {/* Preview card */}
      {preview && (
        <div
          className="rounded-xl overflow-hidden relative"
          style={{ background:"var(--bg3)", border:"1px solid rgba(168,240,122,0.2)" }}
        >
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background:"linear-gradient(90deg,transparent,rgba(168,240,122,0.5),transparent)" }} />

          {/* Header */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom:"1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase"
                    style={{ color:"var(--muted)" }}>
                ☀ Sunday digest preview
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded ml-auto"
                    style={{ background:"rgba(168,240,122,0.1)", color:"var(--accent)" }}>
                {preview.leadsIn} leads analysed → {preview.entries.length} selected
              </span>
            </div>
            <p className="text-[12px] mb-1" style={{ color:"var(--muted)" }}>
              Subject: <span style={{ color:"var(--text)" }}>{preview.subject}</span>
            </p>
            <p className="text-[13px] leading-relaxed mt-3" style={{ color:"var(--text)" }}>
              {preview.intro}
            </p>
          </div>

          {/* Entries */}
          <div className="flex flex-col gap-2 p-4">
            {preview.entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg p-4 relative overflow-hidden"
                style={{
                  background: "var(--bg2)",
                  borderLeft: `3px solid ${urgencyColor(entry.urgency)}`,
                  border:     `1px solid ${urgencyBorder(entry.urgency)}`,
                  borderLeftWidth: 3,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold tracking-[0.08em] uppercase"
                        style={{ color:"var(--muted)" }}>
                    {i + 1} of {preview.entries.length}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background:`${urgencyColor(entry.urgency)}15`, color:urgencyColor(entry.urgency) }}>
                    {entry.urgency}
                  </span>
                </div>
                <div className="text-[15px] font-semibold mb-2" style={{ color:"var(--bright)" }}>
                  {entry.name}
                </div>
                <p className="text-[13px] mb-3 leading-relaxed" style={{ color:"var(--text)" }}>
                  {entry.reason}
                </p>
                <div
                  className="rounded-lg p-3"
                  style={{ background:"rgba(168,240,122,0.06)", border:"1px solid rgba(168,240,122,0.18)" }}
                >
                  <div className="text-[10px] font-semibold tracking-[0.08em] uppercase mb-1"
                       style={{ color:"var(--accent)" }}>
                    Suggested opening
                  </div>
                  <p className="text-[12px] italic" style={{ color:"var(--text)" }}>
                    &ldquo;{entry.opening}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Outro */}
          <div className="px-5 pb-5">
            <p className="text-[12px] italic" style={{ color:"var(--muted)" }}>
              {preview.outro}
            </p>
          </div>
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <p className="text-[13px]" style={{ color:"var(--accent)" }}>
          ✅ Digest sent — check your inbox.
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[12px]" style={{ color:"var(--red)" }}>❌ {error}</p>
      )}
    </div>
  );
}
