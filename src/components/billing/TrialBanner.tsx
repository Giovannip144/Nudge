"use client";

import Link from "next/link";

interface Props {
  status:   string;
  daysLeft: number;
}

export function TrialBanner({ status, daysLeft }: Props) {
  if (status === "active") return null;

  if (status === "paused" || status === "canceled") {
    return (
      <div className="mx-8 mt-4 rounded-xl p-4 flex items-center gap-4" style={{ background:"rgba(240,201,122,0.06)", border:"1px solid rgba(240,201,122,0.25)" }}>
        <span className="text-xl flex-shrink-0">⏸</span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--bright)" }}>Your briefings are paused</div>
          <p className="text-[12px]" style={{ color:"var(--muted)" }}>Your free trial ended. Your leads are safe — subscribe to resume your daily nudges.</p>
        </div>
        <Link href="/upgrade" className="flex-shrink-0 text-[12px] font-semibold px-4 py-2 rounded-lg whitespace-nowrap" style={{ background:"var(--accent)", color:"#0c0c0a", textDecoration:"none" }}>
          Resume — €9/mo →
        </Link>
      </div>
    );
  }

  if (status === "past_due" || status === "unpaid") {
    return (
      <div className="mx-8 mt-4 rounded-xl p-4 flex items-center gap-4" style={{ background:"rgba(240,122,122,0.06)", border:"1px solid rgba(240,122,122,0.2)" }}>
        <span className="text-xl flex-shrink-0">💳</span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--bright)" }}>Payment issue</div>
          <p className="text-[12px]" style={{ color:"var(--muted)" }}>We couldn't process your last payment. Update your details to keep your briefings running.</p>
        </div>
        <a href="/api/stripe/portal" className="flex-shrink-0 text-[12px] font-semibold px-4 py-2 rounded-lg whitespace-nowrap" style={{ background:"var(--amber)", color:"#0c0c0a", textDecoration:"none" }}>
          Fix payment →
        </a>
      </div>
    );
  }

  if (status === "trialing" && daysLeft <= 3) {
    return (
      <div className="mx-8 mt-4 rounded-xl p-4 flex items-center gap-4" style={{ background:"rgba(168,240,122,0.05)", border:"1px solid rgba(168,240,122,0.2)" }}>
        <span className="text-xl flex-shrink-0">⚡</span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--bright)" }}>
            {daysLeft <= 0 ? "Trial ends today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your trial`}
          </div>
          <p className="text-[12px]" style={{ color:"var(--muted)" }}>Lock in €9/month early bird — goes up to €19 after 100 users.</p>
        </div>
        <Link href="/upgrade" className="flex-shrink-0 text-[12px] font-semibold px-4 py-2 rounded-lg whitespace-nowrap" style={{ background:"var(--accent)", color:"#0c0c0a", textDecoration:"none" }}>
          Lock in €9/mo →
        </Link>
      </div>
    );
  }

  return null;
}
