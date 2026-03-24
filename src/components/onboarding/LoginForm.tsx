"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, browser is redirected — no need to setLoading(false)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-8"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border2)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
    >
      {/* Top glow strip */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(168,240,122,0.5), transparent)",
        }}
      />

      <div className="mb-8">
        <h1
          className="font-display text-2xl font-black tracking-tight mb-2"
          style={{ color: "var(--bright)" }}
        >
          Sign in to Nudge
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Connect with Google to get started. Takes 30 seconds.
        </p>
      </div>

      {/* What you get */}
      <div
        className="rounded-xl p-4 mb-6 text-sm flex flex-col gap-2"
        style={{ background: "var(--bg3)", border: "1px solid var(--border)" }}
      >
        {[
          "Daily AI nudges for your leads",
          "Gmail sync — auto last-contact detection",
          "Free for up to 10 leads",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <span style={{ color: "var(--accent)" }}>✓</span>
            <span style={{ color: "var(--text)" }}>{item}</span>
          </div>
        ))}
      </div>

      {error && (
        <div
          className="rounded-lg px-4 py-3 mb-4 text-sm"
          style={{
            background: "rgba(240,122,122,0.1)",
            border: "1px solid rgba(240,122,122,0.2)",
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200"
        style={{
          background: loading ? "var(--bg3)" : "var(--bright)",
          color: "#0c0c0a",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            Connecting…
          </>
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </button>

      <p className="text-center mt-5 text-xs" style={{ color: "var(--muted)" }}>
        By signing in you agree to our{" "}
        <a href="#" style={{ color: "var(--text)", textDecoration: "underline" }}>
          Terms
        </a>{" "}
        and{" "}
        <a href="#" style={{ color: "var(--text)", textDecoration: "underline" }}>
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div
      className="w-4 h-4 rounded-full border-2 animate-spin"
      style={{
        borderColor: "rgba(0,0,0,0.2)",
        borderTopColor: "#0c0c0a",
      }}
    />
  );
}
