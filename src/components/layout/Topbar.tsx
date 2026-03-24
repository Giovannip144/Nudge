"use client";

import { useEffect, useState } from "react";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  userName: string;
  gmailConnected: boolean;
}

export function Topbar({ userName, gmailConnected }: TopbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector("main");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 10);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="h-[54px] flex items-center px-5 gap-3 sticky top-0 z-50 transition-all duration-300"
      style={{
        background: "rgba(12,12,10,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <span
        className="font-display text-xl font-bold tracking-tight"
        style={{ color: "var(--bright)" }}
      >
        nudge<span style={{ color: "var(--accent)" }}>.</span>
      </span>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
        Lead Inbox
      </span>

      <div className="flex-1" />

      {/* Gmail status */}
      <div
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
        style={{
          background: gmailConnected
            ? "rgba(168,240,122,0.08)"
            : "rgba(255,255,255,0.04)",
          border: gmailConnected
            ? "1px solid rgba(168,240,122,0.18)"
            : "1px solid rgba(255,255,255,0.07)",
          color: gmailConnected ? "var(--accent)" : "var(--muted)",
        }}
      >
        {gmailConnected && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 6px var(--accent)",
              animation: "pulseDot 2s infinite",
            }}
          />
        )}
        {gmailConnected ? "Gmail synced" : "Gmail not connected"}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[13px] font-bold cursor-pointer select-none"
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          color: "var(--accent)",
        }}
        title={userName}
      >
        {getInitials(userName || "U")}
      </div>
    </header>
  );
}
