"use client";

/**
 * iter-217 — Pickup-bell client (Tier 16 #126).
 *
 * Big single-input form, oversized "Ring" button, fullscreen
 * confirmation card on success ("✓ The desk has been notified").
 * Designed for one-handed phone use in the lobby.
 */

import { useState, useTransition } from "react";
import { ringBell } from "@/app/actions/bellRing";

export default function BellClient() {
  const [suite, setSuite] = useState("");
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; suiteResolved?: boolean; reason?: string } | null>(null);

  function onRing() {
    setResult(null);
    startTransition(async () => {
      const res = await ringBell({ suiteNumber: suite });
      setResult(res.ok ? { ok: true, suiteResolved: res.suiteResolved } : { ok: false, reason: res.reason });
    });
  }

  if (result?.ok) {
    return (
      <main style={S.root}>
        <div style={S.successCard}>
          <p style={S.bigEmoji}>🔔</p>
          <p style={S.eyebrow}>Bell rung</p>
          <h1 style={S.h1}>Front desk notified</h1>
          <p style={S.sub}>
            We&apos;re grabbing your packages now. Please have a seat — someone will be with you in a moment.
          </p>
          {!result.suiteResolved && (
            <p style={S.warn}>⚠️ Suite #{suite} didn&apos;t match a member on file. Admin will verify at the counter.</p>
          )}
          <button type="button" onClick={() => { setSuite(""); setResult(null); }} style={S.againBtn}>
            Ring again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={S.root}>
      <div style={S.card}>
        <p style={S.bigEmoji}>🛎️</p>
        <p style={S.eyebrow}>NOHO Mailbox · Front desk</p>
        <h1 style={S.h1}>Ring the bell</h1>
        <p style={S.sub}>Type your suite number and tap to let the front desk know you&apos;re here.</p>

        <input value={suite} onChange={(e) => setSuite(e.target.value.replace(/[^\w-]/g, "").slice(0, 12))}
          placeholder="042"
          inputMode="numeric"
          autoFocus
          style={S.input} />

        {result && !result.ok && (
          <p style={S.error}>
            {result.reason === "throttled"
              ? "🕒 You've rung the bell several times — give us a minute and we'll be right with you."
              : result.reason === "invalid_suite"
              ? "Please enter a valid suite number."
              : "Something went wrong. Try again or knock on the counter."}
          </p>
        )}

        <button type="button" onClick={onRing} disabled={busy || !suite.trim()} style={S.ringBtn}>
          {busy ? "Ringing…" : "🔔 Ring the bell"}
        </button>

        <p style={S.foot}>11288 Ventura Blvd #1006 · Studio City, CA</p>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" },
  card: { background: "white", borderRadius: 24, border: "1px solid #E8DDD0", padding: "36px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 16px 48px rgba(45,16,15,0.12)" },
  successCard: { background: "white", borderRadius: 24, border: "2px solid #22C55E", padding: "36px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 16px 48px rgba(34,197,94,0.20)" },
  bigEmoji: { fontSize: 64, lineHeight: 1, margin: 0 },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: "10px 0 0" },
  h1: { fontSize: 32, fontWeight: 900, letterSpacing: "-.5px", margin: "6px 0 8px" },
  sub: { fontSize: 15, color: "rgba(45,16,15,0.65)", margin: "0 0 18px", lineHeight: 1.5 },
  input: { width: "100%", padding: "20px 24px", fontSize: 36, fontWeight: 900, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", textAlign: "center", letterSpacing: ".2em", borderRadius: 14, border: "2px solid #E8DDD0", background: "#FAFAF8", color: "#1F2937", marginBottom: 14 },
  error: { margin: "0 0 12px", fontSize: 13, color: "#b91c1c", fontWeight: 700 },
  ringBtn: { width: "100%", padding: "18px 24px", fontSize: 18, fontWeight: 900, color: "white", background: "#E70013", border: "none", borderRadius: 14, cursor: "pointer", boxShadow: "0 8px 24px rgba(231,0,19,0.30)" },
  againBtn: { marginTop: 16, padding: "11px 22px", fontSize: 13, fontWeight: 800, color: "#3B4252", background: "#F4F5F7", border: "1px solid #ECEEF1", borderRadius: 10, cursor: "pointer" },
  warn: { fontSize: 12, color: "#92400e", background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", margin: "12px 0 0" },
  foot: { fontSize: 11, color: "rgba(45,16,15,0.45)", margin: "16px 0 0" },
};
