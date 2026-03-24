"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingLeadSlot, OnboardingStep } from "@/types";
import { completeOnboarding } from "@/app/api/onboarding/actions";

interface Props {
  initialStep: OnboardingStep;
  initialName: string;
  initialEmail: string;
}

const TOTAL = 5;

export function OnboardingShell({ initialStep, initialName, initialEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep]       = useState<OnboardingStep>(initialStep || 0);
  const [name, setName]       = useState(initialName);
  const [email, setEmail]     = useState(initialEmail);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [phone, setPhone]     = useState("");
  const [time, setTime]       = useState("08:30");
  const [error, setError]     = useState<string | null>(null);

  const [slots, setSlots] = useState<OnboardingLeadSlot[]>([
    { name: "", email: "", note: "" },
    { name: "", email: "", note: "" },
    { name: "", email: "", note: "" },
  ]);

  const filledSlots = slots.filter((s) => s.name.trim().length > 0);
  const allSlotsFilled = filledSlots.length === 3;
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100);

  function updateSlot(i: number, field: keyof OnboardingLeadSlot, value: string) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function goNext() {
    if (step < TOTAL) setStep((s) => (s + 1) as OnboardingStep);
  }

  async function handleFinish() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        name,
        email,
        channel,
        phone,
        nudgeTime: time,
        leads: filledSlots,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/inbox");
      router.refresh();
    });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--bg)" }}
    >
      {/* Mesh blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ width:600,height:600,background:"radial-gradient(circle,#a8f07a,transparent 70%)",filter:"blur(130px)",opacity:.08,top:-200,left:-150 }} />
        <div className="absolute rounded-full" style={{ width:450,height:450,background:"radial-gradient(circle,#7af0b8,transparent 70%)",filter:"blur(130px)",opacity:.07,bottom:0,right:-100 }} />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px]" style={{ background:"var(--border)" }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: "var(--accent)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[500px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="font-display text-4xl font-black tracking-tight" style={{ color:"var(--bright)" }}>
            nudge<span style={{ color:"var(--accent)" }}>.</span>
          </span>
        </div>

        {/* CARD */}
        <div
          className="relative rounded-2xl p-8 overflow-hidden"
          style={{
            background:"var(--bg2)",
            border:"1px solid var(--border2)",
            boxShadow:"0 40px 100px rgba(0,0,0,0.5)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(168,240,122,0.5),transparent)" }} />

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <div className="animate-fade-up">
              <div className="text-5xl mb-5">🧠</div>
              <span className="block text-[10px] font-mono tracking-[0.18em] uppercase mb-3" style={{ color:"var(--accent)" }}>Welcome</span>
              <h2 className="font-display text-3xl font-black tracking-tight mb-3" style={{ color:"var(--bright)" }}>
                Your AI client memory<br />starts <em style={{ fontStyle:"italic", color:"var(--accent)" }}>here</em>
              </h2>
              <p className="text-sm mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>
                Nudge remembers your client conversations and tells you exactly who to follow up with — every morning. Setup takes 3 minutes.
              </p>
              <div className="rounded-xl p-4 mb-6 flex flex-col gap-2 text-sm" style={{ background:"var(--bg3)", border:"1px solid var(--border)" }}>
                {["Free for up to 10 leads","2-min setup — no credit card","Daily AI nudge via email or WhatsApp"].map(t => (
                  <div key={t} className="flex items-center gap-2.5">
                    <span style={{ color:"var(--accent)" }}>✓</span>
                    <span style={{ color:"var(--text)" }}>{t}</span>
                  </div>
                ))}
              </div>
              <button onClick={goNext} className="btn-primary w-full text-[15px] py-3.5">
                Get started →
              </button>
            </div>
          )}

          {/* ── STEP 1: Name + email ── */}
          {step === 1 && (
            <div className="animate-fade-up">
              <span className="block text-[10px] font-mono tracking-[0.18em] uppercase mb-3" style={{ color:"var(--accent)" }}>Step 1 of 5</span>
              <h2 className="font-display text-3xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>
                What&apos;s your <em style={{ fontStyle:"italic",color:"var(--accent)" }}>name</em>?
              </h2>
              <p className="text-sm mb-6" style={{ color:"var(--muted)" }}>Nudge uses this to personalise your daily briefing.</p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color:"var(--muted)" }}>First name</label>
                  <input
                    className="input-base"
                    placeholder="e.g. Sarah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color:"var(--muted)" }}>Email address</label>
                  <input
                    className="input-base"
                    placeholder="e.g. sarah@studio.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-[11px] mt-1.5" style={{ color:"var(--muted)" }}>We'll send your daily nudge here.</p>
                </div>
              </div>
              <button
                onClick={goNext}
                disabled={!name.trim() || !email.trim()}
                className="btn-primary w-full text-[15px] py-3.5 mt-6"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 2: Notification channel ── */}
          {step === 2 && (
            <div className="animate-fade-up">
              <span className="block text-[10px] font-mono tracking-[0.18em] uppercase mb-3" style={{ color:"var(--accent)" }}>Step 2 of 5</span>
              <h2 className="font-display text-3xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>
                How should Nudge <em style={{ fontStyle:"italic",color:"var(--accent)" }}>reach you</em>?
              </h2>
              <p className="text-sm mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>The channel you actually live in determines whether you act on the nudge — or ignore it.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {(["email","whatsapp"] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className="rounded-xl p-4 text-center cursor-pointer transition-all duration-200"
                    style={{
                      background: channel === ch ? "rgba(168,240,122,0.06)" : "var(--bg3)",
                      border: channel === ch ? "2px solid rgba(168,240,122,0.4)" : "2px solid var(--border)",
                    }}
                  >
                    <div className="text-3xl mb-2">{ch === "email" ? "📧" : "💬"}</div>
                    <div className="text-sm font-semibold mb-1" style={{ color: channel === ch ? "var(--accent)" : "var(--bright)" }}>
                      {ch === "email" ? "Email" : "WhatsApp"}
                    </div>
                    <div className="text-[11px]" style={{ color:"var(--muted)" }}>
                      {ch === "email" ? "Morning briefing in your inbox" : "Feels like a colleague message"}
                    </div>
                  </button>
                ))}
              </div>
              {/* Phone number — shown only when WhatsApp is selected */}
              {channel === "whatsapp" && (
                <div className="mb-5">
                  <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color:"var(--muted)" }}>
                    WhatsApp number *
                  </label>
                  <input
                    className="input-base"
                    placeholder="+31 6 12345678"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-[11px] mt-1.5" style={{ color:"var(--muted)" }}>
                    Include your country code — e.g. +31 for the Netherlands.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color:"var(--muted)" }}>Nudge arrival time</label>
                <div className="flex gap-2 flex-wrap">
                  {["07:00","08:30","09:00","10:00"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                      style={{
                        background: time === t ? "rgba(168,240,122,0.1)" : "var(--bg3)",
                        border: time === t ? "1px solid rgba(168,240,122,0.3)" : "1px solid var(--border)",
                        color: time === t ? "var(--accent)" : "var(--muted)",
                        fontWeight: time === t ? 600 : 400,
                      }}
                    >
                      {t} AM
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={goNext} disabled={channel === "whatsapp" && !phone.trim()} className="btn-primary w-full text[15px] py-3.5 mt-6" style={{opacity: channel === "whatsapp" && !phone.trim() ? 0.35 : 1, cursor: channel === "whatsapp" && !phone.trim() ? "not-allowed" : "pointer"}}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 3: Add 3 leads (forced activation) ── */}
          {step === 3 && (
            <div className="animate-fade-up">
              <span className="block text-[10px] font-mono tracking-[0.18em] uppercase mb-3" style={{ color:"var(--accent)" }}>Step 3 of 5 — Required</span>
              <h2 className="font-display text-3xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>
                Add your first <em style={{ fontStyle:"italic",color:"var(--accent)" }}>3 leads</em>
              </h2>
              <p className="text-sm mb-5" style={{ color:"var(--muted)", lineHeight:1.75 }}>
                Think of 3 people who could bring you work. Name + one note. This is where the value starts.
              </p>
              <div className="flex flex-col gap-3">
                {slots.map((slot, i) => {
                  const filled = slot.name.trim().length > 0;
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200"
                      style={{
                        background: filled ? "rgba(168,240,122,0.04)" : "var(--bg3)",
                        border: filled ? "1px solid rgba(168,240,122,0.25)" : "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: filled ? "var(--accent)" : "rgba(168,240,122,0.12)",
                            border: filled ? "none" : "1px solid rgba(168,240,122,0.2)",
                            color: filled ? "#0c0c0a" : "var(--accent)",
                          }}
                        >
                          {filled ? "✓" : i + 1}
                        </div>
                        <span className="text-xs font-semibold" style={{ color:"var(--muted)" }}>
                          Lead {i + 1}{filled ? ` — ${slot.name}` : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          className="input-base text-[13px] py-2.5"
                          placeholder="Full name *"
                          value={slot.name}
                          onChange={(e) => updateSlot(i, "name", e.target.value)}
                        />
                        <input
                          className="input-base text-[13px] py-2.5"
                          placeholder="Email (optional)"
                          value={slot.email}
                          onChange={(e) => updateSlot(i, "email", e.target.value)}
                        />
                      </div>
                      <textarea
                        className="input-base text-[13px] resize-none min-h-[52px] py-2.5"
                        placeholder="One sentence about this person…"
                        value={slot.note}
                        onChange={(e) => updateSlot(i, "note", e.target.value)}
                        maxLength={500}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[11px] mt-3" style={{ color:"var(--muted)" }}>
                All 3 required to continue — this is where the value starts
              </p>
              <button
                onClick={goNext}
                disabled={!allSlotsFilled}
                className="btn-primary w-full text-[15px] py-3.5 mt-4"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 4: Confirm ── */}
          {step === 4 && (
            <div className="animate-fade-up">
              <span className="block text-[10px] font-mono tracking-[0.18em] uppercase mb-3" style={{ color:"var(--accent)" }}>Step 4 of 5 — Almost there</span>
              <h2 className="font-display text-3xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>
                Review your <em style={{ fontStyle:"italic",color:"var(--accent)" }}>setup</em>
              </h2>
              <p className="text-sm mb-6" style={{ color:"var(--muted)" }}>Everything looks good. Confirm to activate your account.</p>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label:"Name",    value: name || "—" },
                  { label:"Channel", value: channel === "whatsapp" ? "💬 WhatsApp" : "📧 Email" },
                  { label:"Nudge time", value: `${time} AM` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg p-3 text-center" style={{ background:"var(--bg3)", border:"1px solid var(--border)" }}>
                    <div className="font-display text-lg font-black" style={{ color:"var(--bright)" }}>{item.value}</div>
                    <div className="text-[10px] mt-1" style={{ color:"var(--muted)" }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {channel === "whatsapp" && phone && (
                <div className="rounded-lg p-3 mb-4 flex items-center gap-3" style={{ background:"rgba(168,240,122,0.06)", border:"1px solid rgba(168,240,122,0.2)" }}>
                  <span>💬</span>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color:"var(--accent)" }}>WhatsApp number</div>
                    <div className="text-[13px]" style={{ color:"var(--bright)" }}>{phone}</div>
                  </div>
                </div>
              )}

              {/* Preview nudge */}
              <div className="rounded-xl p-4 mb-5 relative overflow-hidden" style={{ background:"rgba(168,240,122,0.05)", border:"1px solid rgba(168,240,122,0.2)" }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(168,240,122,0.4),transparent)" }} />
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background:"rgba(168,240,122,0.12)" }}>🔔</div>
                  <div>
                    <div className="text-[10px]" style={{ color:"var(--muted)" }}>Nudge · Daily briefing</div>
                    <div className="text-xs font-semibold" style={{ color:"var(--bright)" }}>Good morning, {name || "there"}</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color:"var(--text)" }}>
                  <strong style={{ color:"var(--bright)" }}>{filledSlots[0]?.name || "Your first lead"}</strong> is one of your{" "}
                  <span style={{ color:"var(--accent)" }}>{filledSlots.length} leads</span>. Nudge will alert you when it&apos;s time to follow up.
                </p>
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 mb-4 text-sm" style={{ background:"rgba(240,122,122,0.1)", border:"1px solid rgba(240,122,122,0.2)", color:"var(--red)" }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleFinish}
                disabled={isPending}
                className="btn-primary w-full text-[15px] py-3.5"
              >
                {isPending ? "Activating…" : "Activate Nudge →"}
              </button>
            </div>
          )}
        </div>

        {/* Step dots */}
        {step > 0 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: TOTAL }, (_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i + 1 === step ? 20 : 6,
                  background: i + 1 <= step ? "var(--accent)" : "var(--border2)",
                  opacity: i + 1 < step ? 0.4 : 1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
