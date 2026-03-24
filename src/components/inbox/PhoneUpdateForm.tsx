"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PhoneUpdateForm({ currentPhone }: { currentPhone: string }) {
  const router  = useRouter();
  const [phone,  setPhone]  = useState(currentPhone);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSave() {
    if (!phone.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile/phone", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ phone }),
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

  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
    >
      <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--bright)" }}>
        WhatsApp number
      </div>
      <p className="text-[12px] mb-3" style={{ color: "var(--muted)" }}>
        The number where Nudge sends your daily message. Include your country code.
      </p>
      <div className="flex gap-2">
        <input
          className="input-base flex-1"
          placeholder="+31 6 12345678"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={saving || !phone.trim()}
          className="btn-primary text-[13px] py-2 px-4 whitespace-nowrap"
        >
          {saving ? "Saving…" : saved ? "✅ Saved" : "Save"}
        </button>
      </div>
      {error && (
        <p className="text-[12px] mt-1.5" style={{ color: "var(--red)" }}>❌ {error}</p>
      )}
    </div>
  );
}
