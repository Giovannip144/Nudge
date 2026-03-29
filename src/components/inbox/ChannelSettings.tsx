"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentChannel: "email" | "whatsapp";
  currentPhone: string;
}

export function ChannelSettings({ currentChannel, currentPhone }: Props) {
  const router   = useRouter();
  const [channel, setChannel] = useState<"email" | "whatsapp">(currentChannel);
  const [phone,   setPhone]   = useState(currentPhone);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSave() {
    if (channel === "whatsapp" && !phone.trim()) {
      setError("Fill in your WhatsApp number first");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile/phone", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ channel, phone: phone.trim() }),
    });

    setSaving(false);

    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  }

  const changed = channel !== currentChannel || phone !== currentPhone;

  return (
    <div
      className="rounded-xl p-5 mb-5"
      style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
    >
      <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--bright)" }}>
        Notification channel
      </div>
      <p className="text-[12px] mb-4" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
        Choose how you receive your daily nudge.
      </p>

      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        {(["email", "whatsapp"] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
            style={{
              background: channel === ch ? "var(--accent)" : "var(--bg3)",
              color:      channel === ch ? "#0c0c0a"       : "var(--muted)",
              border:     channel === ch ? "none"          : "1px solid var(--border)",
            }}
          >
            {ch === "email" ? "📧 Email" : "💬 WhatsApp"}
          </button>
        ))}
      </div>

      {/* Phone input — only when whatsapp */}
      {channel === "whatsapp" && (
        <div className="mb-4">
          <label className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-1.5 block" style={{ color: "var(--muted)" }}>
            WhatsApp number
          </label>
          <input
            className="input-base w-full"
            placeholder="+31 6 12345678"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <p className="text-[11px] mt-1.5" style={{ color: "var(--muted)" }}>
            Include country code. Make sure this number has WhatsApp.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] mb-3" style={{ color: "var(--red)" }}>❌ {error}</p>
      )}

      {changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-[13px] py-2 px-5"
        >
          {saving ? "Saving…" : saved ? "✅ Saved" : "Save changes"}
        </button>
      )}

      {saved && !changed && (
        <p className="text-[12px]" style={{ color: "var(--accent)" }}>✅ Saved</p>
      )}
    </div>
  );
}
