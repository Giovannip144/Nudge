import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ payment?: string; error?: string }>;
}

export default async function UpgradePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tier, stripe_subscription_status, trial_ends_at, trial_started_at")
    .eq("id", user.id)
    .single();

  if (profile?.tier === "starter" && profile?.stripe_subscription_status === "active") {
    redirect("/inbox");
  }

  const { payment, error } = await searchParams;
  const trialEnded = profile?.stripe_subscription_status === "paused";
  const isPastDue  = profile?.stripe_subscription_status === "past_due";
  const daysOver   = profile?.trial_ends_at
    ? Math.max(0, Math.floor((Date.now() - new Date(profile.trial_ends_at).getTime()) / 86400000))
    : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background:"var(--bg)" }}>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ width:600,height:600,background:"radial-gradient(circle,#a8f07a,transparent 70%)",filter:"blur(130px)",opacity:.07,top:-200,left:-150 }} />
      </div>
      <div className="relative z-10 w-full max-w-[480px]">
        <div className="text-center mb-8">
          <span className="font-display text-4xl font-black tracking-tight" style={{ color:"var(--bright)" }}>nudge<span style={{ color:"var(--accent)" }}>.</span></span>
        </div>

        {payment === "cancelled" && (
          <div className="rounded-xl px-4 py-3 mb-4 text-[13px]" style={{ background:"rgba(240,201,122,0.08)", border:"1px solid rgba(240,201,122,0.2)", color:"var(--amber)" }}>
            No problem — you can subscribe whenever you're ready.
          </div>
        )}

        <div className="relative rounded-2xl p-8 overflow-hidden" style={{ background:"var(--bg2)", border:"1px solid var(--border2)", boxShadow:"0 40px 100px rgba(0,0,0,0.5)" }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(168,240,122,0.5),transparent)" }} />

          {trialEnded ? (
            <>
              <div className="text-4xl mb-4">⏸</div>
              <h1 className="font-display text-2xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>Your briefings are paused</h1>
              <p className="text-[14px] mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>
                {daysOver > 0
                  ? `Your 14-day trial ended ${daysOver} day${daysOver !== 1 ? "s" : ""} ago.`
                  : "Your 14-day trial has ended."
                }{" "}Your leads and all your data are safe — nothing was deleted. Subscribe to pick up exactly where you left off.
              </p>
            </>
          ) : isPastDue ? (
            <>
              <div className="text-4xl mb-4">💳</div>
              <h1 className="font-display text-2xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>Payment issue</h1>
              <p className="text-[14px] mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>
                We couldn't process your last payment. Update your details to keep your briefings running.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-4">⚡</div>
              <h1 className="font-display text-2xl font-black tracking-tight mb-2" style={{ color:"var(--bright)" }}>Lock in your early bird rate</h1>
              <p className="text-[14px] mb-6" style={{ color:"var(--muted)", lineHeight:1.75 }}>
                Your trial is ending soon. Subscribe now to keep your daily nudges — early bird rate locked forever.
              </p>
            </>
          )}

          {/* Feature list */}
          <div className="rounded-xl p-4 mb-6" style={{ background:"var(--bg3)", border:"1px solid var(--border)" }}>
            {[
              "Daily AI nudge — contextual, not rule-based",
              "Sunday digest — top 3 leads every week",
              "Gmail auto-sync — last contact auto-detected",
              "Unlimited leads",
              "WhatsApp or email — your choice",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color:"var(--accent)", flexShrink:0 }}>✓</span>
                <span className="text-[13px]" style={{ color:"var(--text)" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="font-display text-5xl font-black" style={{ color:"var(--bright)" }}>€9</span>
            <div>
              <div className="text-[13px] font-semibold" style={{ color:"var(--text)" }}>per month</div>
              <div className="text-[11px]" style={{ color:"var(--muted)" }}>Early bird rate · locked forever · was <span style={{ textDecoration:"line-through" }}>€19</span></div>
            </div>
          </div>

          <a
            href={isPastDue ? "/api/stripe/portal" : "/api/stripe/checkout"}
            style={{ display:"block", textDecoration:"none", background:"var(--accent)", color:"#0c0c0a", fontFamily:"DM Sans, sans-serif", fontWeight:700, fontSize:15, textAlign:"center", padding:"14px 24px", borderRadius:8, transition:"all .2s" }}
          >
            {isPastDue ? "Update payment details →" : trialEnded ? "Resume for €9/month →" : "Start for €9/month →"}
          </a>

          <p className="text-center text-[11px] mt-3" style={{ color:"var(--muted)" }}>
            Cancel anytime · No hidden fees · Flat rate forever
          </p>
        </div>

        <p className="text-center text-[12px] mt-4" style={{ color:"var(--muted)" }}>
          Your data is safe for 90 days after trial ends.
        </p>
      </div>
    </div>
  );
}
