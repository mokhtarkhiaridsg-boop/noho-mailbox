"use client";

// iter-96 — TOTP 2FA enrollment card.
//
// Three states: disabled (button to start) → enrolling (QR + verify
// input + recovery codes) → enabled (status + disable form). Recovery
// codes are shown ONCE during enrollment and immediately marked
// "saved by me".

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { BRAND } from "./types";
import { enable2FA, confirm2FA, disable2FA, getMy2FAStatus } from "@/app/actions/security";

type Status = { enabled: boolean; recoveryCodesRemaining: number | null } | null;

export default function TotpEnrollmentCard() {
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  // Enrollment intermediate state
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() { void getMy2FAStatus().then(setStatus).catch(() => setStatus({ enabled: false, recoveryCodesRemaining: null })); }
  useEffect(() => { refresh(); }, []);

  function startEnroll() {
    setMsg(null);
    startTransition(async () => {
      const res = await enable2FA();
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setSecret((res as { secret?: string }).secret ?? null);
      setUri((res as { uri?: string }).uri ?? null);
      setRecoveryCodes((res as { recoveryCodes?: string[] }).recoveryCodes ?? null);
      setRecoverySaved(false);
      // Generate QR data URL on the client.
      if ((res as { uri?: string }).uri) {
        const dataUrl = await QRCode.toDataURL((res as { uri: string }).uri, { width: 240, margin: 1, errorCorrectionLevel: "M", color: { dark: "#2D100F", light: "#ffffff" } });
        setQrUrl(dataUrl);
      }
    });
  }

  function confirm() {
    setMsg(null);
    startTransition(async () => {
      const res = await confirm2FA(verifyCode);
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setSecret(null); setUri(null); setQrUrl(null); setRecoveryCodes(null); setVerifyCode("");
      setMsg("✓ 2FA enabled");
      refresh();
    });
  }

  function disable() {
    setMsg(null);
    startTransition(async () => {
      const res = await disable2FA(disableCode);
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setDisableCode("");
      setMsg("✓ 2FA disabled");
      refresh();
    });
  }

  function copyRecovery() {
    if (!recoveryCodes) return;
    void navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setRecoverySaved(true);
  }

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
            Two-factor authentication
          </h3>
        </div>
        {status && (
          <span
            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
            style={{
              background: status.enabled ? "rgba(22,163,74,0.14)" : "rgba(45,16,15,0.06)",
              color: status.enabled ? "#15803d" : "rgba(45,16,15,0.55)",
            }}
          >
            {status.enabled ? "Enabled" : "Disabled"}
          </span>
        )}
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Add a second factor (Google Authenticator, 1Password, Authy, etc.). Required for high-impact admin actions if you turn it on.
      </p>

      {msg && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}
        >
          {msg}
        </div>
      )}

      {/* ── State 1: enrolled, show disable form ─────────────────────── */}
      {status?.enabled && !secret && (
        <div className="space-y-3">
          {status.recoveryCodesRemaining != null && (
            <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>
              <strong style={{ color: BRAND.ink }}>{status.recoveryCodesRemaining}</strong> recovery codes remaining.
            </p>
          )}
          <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: BRAND.blueDeep }}>
              Disable 2FA
            </p>
            <div className="flex items-stretch gap-2">
              <input
                type="text"
                inputMode="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="6-digit code OR a recovery code"
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
              />
              <button type="button" onClick={disable} disabled={pending || !disableCode.trim()}
                className="px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50"
                style={{ borderColor: "#991b1b", color: "#991b1b", background: "white" }}>
                Disable
              </button>
            </div>
            <p className="text-[10.5px] mt-2" style={{ color: BRAND.inkSoft }}>
              Lost your phone? Use any of your recovery codes here instead of a 6-digit code.
            </p>
          </div>
        </div>
      )}

      {/* ── State 2: enrollment in progress ─────────────────────────── */}
      {!status?.enabled && secret && qrUrl && recoveryCodes && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4 text-center" style={{ borderColor: BRAND.border, background: "white" }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: BRAND.inkSoft }}>
              1 · Scan with your authenticator
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="TOTP QR" style={{ width: 200, height: 200, display: "inline-block", border: `1px solid ${BRAND.border}`, borderRadius: 8 }} />
            <p className="text-[11px] mt-2 font-mono" style={{ color: BRAND.inkSoft, wordBreak: "break-all" }}>
              {secret}
            </p>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: "#fde68a", background: "rgba(245,166,35,0.06)" }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "#92400e" }}>
              2 · Save recovery codes (shown ONCE)
            </p>
            <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>
              If you lose your phone, any one of these codes can disable 2FA. Print them, save in 1Password, screenshot — whatever works.
            </p>
            <pre className="mt-2 p-2 rounded text-[12.5px] font-mono leading-relaxed" style={{ background: "white", color: BRAND.ink, border: `1px solid ${BRAND.border}` }}>
{recoveryCodes.join("\n")}
            </pre>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={copyRecovery}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
                style={{ borderColor: BRAND.blue, color: BRAND.blueDeep, background: "white" }}>
                {recoverySaved ? "Copied ✓" : "Copy all"}
              </button>
              <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: BRAND.ink }}>
                <input type="checkbox" checked={recoverySaved} onChange={(e) => setRecoverySaved(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#337485]" />
                I saved my recovery codes
              </label>
            </div>
          </div>

          <div className="rounded-xl border p-4" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
            <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: BRAND.blueDeep }}>
              3 · Enter the 6-digit code from your app
            </p>
            <div className="flex items-stretch gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="flex-1 rounded-lg border px-3 py-2 text-base font-mono tracking-[0.4em] text-center"
                style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
                autoFocus
              />
              <button type="button" onClick={confirm} disabled={pending || verifyCode.length !== 6 || !recoverySaved}
                className="px-3 py-2 rounded-lg text-xs font-black text-white disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
                {pending ? "…" : "Confirm & enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── State 3: not enrolled, show enable button ─────────────── */}
      {!status?.enabled && !secret && (
        <button type="button" onClick={startEnroll} disabled={pending}
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
          {pending ? "Generating…" : "Enable two-factor →"}
        </button>
      )}
    </div>
  );
}
