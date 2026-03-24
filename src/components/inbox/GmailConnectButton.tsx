"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isConnected: boolean;
}

export function GmailConnectButton({ isConnected }: Props) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  async function handleManualScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/gmail/scan", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setScanResult(`✅ Scan complete — ${data.updated} lead${data.updated !== 1 ? "s" : ""} updated`);
        router.refresh(); // Refresh server component to show new dates
      } else {
        setScanResult(`❌ ${data.error ?? "Scan failed"}`);
      }
    } catch {
      setScanResult("❌ Network error");
    } finally {
      setScanning(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          {/* Manual scan trigger */}
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all duration-150"
            style={{
              background: "rgba(168,240,122,0.1)",
              border: "1px solid rgba(168,240,122,0.25)",
              color: scanning ? "var(--muted)" : "var(--accent)",
              cursor: scanning ? "not-allowed" : "pointer",
            }}
          >
            {scanning ? (
              <>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                  style={{ borderColor: "rgba(168,240,122,0.3)", borderTopColor: "var(--accent)" }}
                />
                Scanning…
              </>
            ) : (
              <>🔄 Scan now</>
            )}
          </button>

          {/* Disconnect */}
          <a
            href="/api/gmail/disconnect"
            className="text-[12px] underline underline-offset-2"
            style={{ color: "var(--muted)" }}
          >
            Disconnect
          </a>
        </div>

        {/* Scan result flash */}
        {scanResult && (
          <p className="text-[12px]" style={{ color: scanResult.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>
            {scanResult}
          </p>
        )}
      </div>
    );
  }

  return (
    <a
      href="/api/gmail/connect"
      className="inline-flex items-center gap-2.5 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-all duration-150"
      style={{
        background: "var(--bg3)",
        border: "1px solid var(--border2)",
        color: "var(--bright)",
        textDecoration: "none",
      }}
    >
      <GoogleIcon />
      Connect Gmail
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
