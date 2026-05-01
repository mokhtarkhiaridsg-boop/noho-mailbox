"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState } from "react";
import { resetPassword, validateResetToken, type ResetState } from "@/app/actions/password-reset";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const SURFACE = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

const inputStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BORDER}`,
  color: INK,
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPassword, {});

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    validateResetToken(token).then((r) => setTokenValid(r.valid));
  }, [token]);

  if (tokenValid === null) {
    return (
      <div className="text-center text-sm py-8" style={{ color: INK_SOFT }}>
        Verifying link…
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M24 4 L44 40 L4 40 Z" fill="var(--color-danger-soft)" />
            <path d="M24 18 L24 28" />
            <circle cx="24" cy="34" r="1.2" fill="var(--color-danger)" />
          </svg>
        </div>
        <h2 className="font-black text-lg mb-2" style={{ color: INK }}>Link expired</h2>
        <p className="text-sm mb-6" style={{ color: INK_SOFT }}>
          This password reset link is invalid or has already been used. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
            color: CREAM,
            boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
          }}
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="24" r="20" fill="var(--color-success-soft)" />
            <path d="M14 24 L21 31 L34 18" />
          </svg>
        </div>
        <h2 className="font-black text-lg mb-2" style={{ color: INK }}>Password updated!</h2>
        <p className="text-sm mb-6" style={{ color: INK_SOFT }}>
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
            color: CREAM,
            boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
          }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-black text-lg mb-1" style={{ color: INK }}>Set new password</h2>
      <p className="text-sm mb-6" style={{ color: INK_SOFT }}>Choose a strong password (8+ characters).</p>

      {state.error && (
        <div
          className="mb-4 text-xs font-bold p-3 rounded-xl"
          style={{
            background: "var(--color-danger-soft)",
            color: "#7F1D1D",
            border: "1px solid rgba(239,68,68,0.30)",
          }}
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
            New password
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
            Confirm password
          </label>
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            placeholder="Repeat password"
            autoComplete="new-password"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="block w-full text-center font-black py-3.5 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
            color: CREAM,
            boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
          }}
        >
          {pending ? "Updating…" : "Update Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${CREAM_DEEP} 0%, ${BG_LIGHT} 55%, ${SURFACE} 100%)`,
        color: INK,
      }}
    >
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-40 blur-[120px] pointer-events-none"
        style={{ background: CREAM }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-30 blur-[100px] pointer-events-none"
        style={{ background: "rgba(51,116,133,0.30)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/" aria-label="NOHO Mailbox home">
            <Logo className="mx-auto h-10 w-auto mb-4" />
          </Link>
          <p
            className="text-base"
            style={{ color: BLUE, fontFamily: "var(--font-pacifico), cursive" }}
          >
            Almost there
          </p>
        </div>

        <div
          className="animate-fade-up delay-100 rounded-3xl p-7 sm:p-8"
          style={{
            background: "white",
            border: `1px solid ${BORDER}`,
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          <Suspense fallback={<div className="text-center text-sm py-8" style={{ color: INK_SOFT }}>Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: INK_FAINT }}>
          Need help?{" "}
          <a href="tel:+18185067744" className="font-black hover:underline" style={{ color: BLUE }}>
            (818) 506-7744
          </a>
        </p>
      </div>
    </div>
  );
}
