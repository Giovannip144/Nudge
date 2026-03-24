"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
  onCreate: (input: { name: string; email: string; note: string }) => Promise<void>;
  loading: boolean;
}

export function AddLeadModal({ onClose, onCreate, loading }: Props) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [note,  setNote]  = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!name.trim()) return;
    await onCreate({ name, email, note });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[460px] rounded-2xl p-8 overflow-hidden"
        style={{
          background: "var(--bg2)",
          border: "1px solid var(--border2)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(168,240,122,0.4),transparent)" }} />

        <h2 className="font-display text-[22px] font-black tracking-tight mb-1" style={{ color: "var(--bright)" }}>
          Add a lead
        </h2>
        <p className="text-[12px] mb-6" style={{ color: "var(--muted)" }}>
          Name + one note. That&apos;s all Nudge needs.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: "var(--muted)" }}>
              Full name *
            </label>
            <input
              ref={nameRef}
              className="input-base"
              placeholder="e.g. Daan Visser"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: "var(--muted)" }}>
              Email <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — for Gmail sync)</span>
            </label>
            <input
              className="input-base"
              placeholder="e.g. daan@company.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-[11px] mt-1.5" style={{ color: "var(--muted)" }}>
              Used to auto-detect when you last emailed this person.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-1.5" style={{ color: "var(--muted)" }}>
              One note
            </label>
            <textarea
              className="input-base resize-none min-h-[72px] leading-relaxed"
              placeholder="e.g. Interested in Q4 redesign, prefers async comms…"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="text-[11px] text-right mt-1" style={{ color: "var(--muted)" }}>
              {note.length} / 500
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 justify-end mt-6">
          <button
            onClick={onClose}
            className="btn-ghost text-[13px] py-2.5 px-4"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="btn-primary text-[13px] py-2.5 px-5"
          >
            {loading ? "Adding…" : "Add lead →"}
          </button>
        </div>
      </div>
    </div>
  );
}
