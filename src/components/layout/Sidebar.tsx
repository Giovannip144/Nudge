"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserTier } from "@/types";

interface SidebarProps {
  tier:           UserTier;
  subStatus?:     string | null;
  trialEndsAt?:   string | null;
  daysLeft?:      number;
}

const NAV = [
  { href: "/inbox",    label: "Lead Inbox", icon: "📋" },
  { href: "/nudges",   label: "Nudges",     icon: "🔔" },
  { href: "/settings", label: "Settings",   icon: "⚙️" },
];

export function Sidebar({ tier, subStatus, trialEndsAt, daysLeft }: SidebarProps) {
  const pathname = usePathname();

  const isTrialing = subStatus === "trialing";
  const isActive   = subStatus === "active";
  const days       = daysLeft ?? 0;

  // Progress bar for trial: 14 days total
  const trialPct  = isTrialing ? Math.max(0, Math.min(100, ((14 - days) / 14) * 100)) : 100;
  const urgent    = days <= 3;

  return (
    <aside
      className="hidden md:flex w-[220px] flex-col gap-0.5 py-4 sticky top-[54px] h-[calc(100vh-54px)] overflow-y-auto flex-shrink-0"
      style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)" }}
    >
      <div className="px-5 pb-1.5 text-[9px] tracking-[0.18em] uppercase" style={{ color:"var(--muted)" }}>
        Main
      </div>

      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-5 py-2 text-[13px] font-medium transition-all duration-150 relative",
              active ? "text-bright" : "hover:text-text hover:bg-white/[0.04]"
            )}
            style={{
              color:      active ? "var(--bright)" : "var(--muted)",
              background: active ? "rgba(168,240,122,0.08)" : undefined,
            }}
          >
            {active && (
              <span
                className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                style={{ background: "var(--accent)" }}
              />
            )}
            <span className="text-[15px] w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="flex-1" />

      {/* ── Trial / subscription status badge ── */}
      <div className="px-4 pb-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>

        {/* TRIALING */}
        {isTrialing && (
          <div
            className="rounded-xl p-3"
            style={{
              background: urgent ? "rgba(240,201,122,0.08)" : "rgba(168,240,122,0.06)",
              border:     `1px solid ${urgent ? "rgba(240,201,122,0.25)" : "rgba(168,240,122,0.18)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[11px] font-semibold"
                style={{ color: urgent ? "var(--amber)" : "var(--accent)" }}
              >
                {urgent ? "⏰ Trial ending" : "✨ Free trial"}
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: urgent ? "var(--amber)" : "var(--accent)" }}
              >
                {days}d left
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden mb-2.5" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width:      `${trialPct}%`,
                  background: urgent
                    ? "linear-gradient(90deg,var(--amber),#f0a87a)"
                    : "linear-gradient(90deg,var(--accent),#7af0b8)",
                }}
              />
            </div>

            <p className="text-[10px] mb-2" style={{ color:"var(--muted)", lineHeight:1.5 }}>
              {days === 0
                ? "Trial ends today."
                : `${days} day${days !== 1 ? "s" : ""} of full access remaining.`}
            </p>

            <Link
              href="/upgrade"
              className="block text-center text-[11px] font-semibold py-1.5 rounded-lg transition-all"
              style={{
                background:    urgent ? "rgba(240,201,122,0.15)" : "rgba(168,240,122,0.12)",
                color:         urgent ? "var(--amber)"           : "var(--accent)",
                border:        `1px solid ${urgent ? "rgba(240,201,122,0.3)" : "rgba(168,240,122,0.25)"}`,
                textDecoration: "none",
              }}
            >
              Subscribe — €9/month →
            </Link>
          </div>
        )}

        {/* ACTIVE */}
        {isActive && (
          <div
            className="rounded-xl p-3"
            style={{ background:"rgba(168,240,122,0.06)", border:"1px solid rgba(168,240,122,0.18)" }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background:"var(--accent)", boxShadow:"0 0 5px var(--accent)" }}
              />
              <span className="text-[11px] font-semibold" style={{ color:"var(--accent)" }}>
                Starter plan
              </span>
            </div>
            <p className="text-[10px]" style={{ color:"var(--muted)" }}>
              Unlimited leads · All features
            </p>
            <Link
              href="/api/stripe/portal"
              className="block text-center text-[10px] font-semibold py-1 mt-2 rounded"
              style={{ color:"var(--muted)", textDecoration:"none" }}
            >
              Manage billing →
            </Link>
          </div>
        )}

        {/* FREE / OTHER */}
        {!isTrialing && !isActive && (
          <div
            className="rounded-xl p-3"
            style={{ background:"var(--bg3)", border:"1px solid var(--border)" }}
          >
            <div className="text-[11px] font-semibold mb-1" style={{ color:"var(--muted)" }}>
              {tier === "free" ? "Free plan" : "Plan"}
            </div>
            <Link
              href="/upgrade"
              className="block text-center text-[11px] font-semibold py-1.5 rounded-lg"
              style={{
                background:    "rgba(168,240,122,0.1)",
                color:         "var(--accent)",
                border:        "1px solid rgba(168,240,122,0.2)",
                textDecoration: "none",
              }}
            >
              Subscribe — €9/month →
            </Link>
          </div>
        )}

      </div>
    </aside>
  );
}
