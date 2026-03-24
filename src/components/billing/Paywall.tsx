"use client";

interface PaywallProps {
  reason:      "trial_expired" | "past_due" | "canceled" | "paused";
  userName:    string;
  trialEnded?: string; // ISO date string
}

const MESSAGES = {
  trial_expired: {
    emoji:   "⏰",
    title:   "Your free trial has ended",
    body:    "Your 14 days are up. All your leads and notes are safe — your nudges are just paused until you continue.",
    cta:     "Continue for €9/month →",
    sub:     "Early bird price · locked forever · cancel anytime",
  },
  paused: {
    emoji:   "⏸",
    title:   "Your nudges are paused",
    body:    "Your trial period has ended. Everything is still here — pick up where you left off in 60 seconds.",
    cta:     "Reactivate for €9/month →",
    sub:     "Early bird price · cancel anytime in one click",
  },
  past_due: {
    emoji:   "💳",
    title:   "Payment issue — nudges paused",
    body:    "We couldn't process your last payment. Update your card and your nudges restart immediately.",
    cta:     "Update payment method →",
    sub:     "Takes 30 seconds · your data is safe",
  },
  canceled: {
    emoji:   "👋",
    title:   "Your subscription has ended",
    body:    "Your nudges are paused but all your leads and notes are still here. Come back any time.",
    cta:     "Reactivate →",
    sub:     "€9/month · cancel anytime",
  },
};

export function Paywall({ reason, userName }: PaywallProps) {
  const msg    = MESSAGES[reason];
  const href   = reason === "past_due"
    ? "/api/stripe/portal"
    : "/api/stripe/checkout";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(12,12,10,0.96)", backdropFilter: "blur(12px)" }}
    >
      {/* Mesh blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ width:500,height:500,background:"radial-gradient(circle,#a8f07a,transparent 70%)",filter:"blur(120px)",opacity:.07,top:-150,left:-100 }} />
        <div className="absolute rounded-full" style={{ width:400,height:400,background:"radial-gradient(circle,#7ab8f0,transparent 70%)",filter:"blur(120px)",opacity:.06,bottom:-50,right:-100 }} />
      </div>

      <div
        className="relative z-10 w-full max-w-[460px] rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg2)",
          border:     "1px solid var(--border2)",
          boxShadow:  "0 40px 100px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top accent */}
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg,#a8f07a,#7af0b8)" }} />

        <div className="p-8">
          {/* Logo */}
          <div className="font-display text-2xl font-black tracking-tight mb-6" style={{ color:"var(--bright)" }}>
            nudge<span style={{ color:"var(--accent)" }}>.</span>
          </div>

          {/* Emoji + title */}
          <div className="text-4xl mb-4">{msg.emoji}</div>
          <h2 className="font-display text-2xl font-black tracking-tight mb-3" style={{ color:"var(--bright)", letterSpacing:"-.02em" }}>
            {msg.title.replace("Your", `${userName}'s`).replace("Your", userName + "'s")}
          </h2>
          <p className="text-[14px] mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>
            {msg.body}
          </p>

          {/* What's preserved */}
          {(reason === "trial_expired" || reason === "paused") && (
            <div
              className="rounded-xl p-4 mb-6 flex flex-col gap-2"
              style={{ background:"var(--bg3)", border:"1px solid var(--border)" }}
            >
              {["Your leads and notes are saved","Gmail connection is still active","Nudges resume same day you subscribe"].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-[13px]">
                  <span style={{ color:"var(--accent)" }}>✓</span>
                  <span style={{ color:"var(--text)" }}>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          {reason !== "past_due" && reason !== "canceled" && (
            <div
              className="flex items-baseline gap-3 mb-4"
            >
              <span className="font-display text-4xl font-black" style={{ color:"var(--bright)" }}>€9</span>
              <div>
                <div className="text-[13px] font-semibold" style={{ color:"var(--text)" }}>per month</div>
                <div className="text-[11px]" style={{ color:"var(--muted)" }}>Early bird · locked forever</div>
              </div>
              <div className="ml-auto text-[11px] px-2 py-1 rounded" style={{ background:"rgba(168,240,122,0.1)", color:"var(--accent)", border:"1px solid rgba(168,240,122,0.2)" }}>
                was €19
              </div>
            </div>
          )}

          <a
            href={href}
            className="block w-full text-center font-semibold text-[15px] py-3.5 rounded-xl transition-all duration-200"
            style={{
              background:  "var(--accent)",
              color:       "#0c0c0a",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#bffa94";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow  = "0 12px 32px rgba(168,240,122,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow  = "none";
            }}
          >
            {msg.cta}
          </a>

          <p className="text-center text-[11px] mt-3" style={{ color:"var(--muted)" }}>
            {msg.sub}
          </p>
        </div>
      </div>
    </div>
  );
}
