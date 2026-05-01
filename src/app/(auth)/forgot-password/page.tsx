"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "@/app/actions/password-reset";

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

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    {}
  );

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
            No worries
          </p>
          <h1
            className="mt-1 text-2xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Reset your password
          </h1>
        </div>

        <div
          className="animate-fade-up delay-100 rounded-3xl p-7 sm:p-8"
          style={{
            background: "white",
            border: `1px solid ${BORDER}`,
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          {state.success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 64 48" fill="none" className="w-14 h-12">
                  <rect x="3" y="3" width="58" height="42" rx="6" fill={CREAM} stroke={INK} strokeWidth="2.5" />
                  <path d="M5 6 L32 26 L59 6" stroke={INK} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                  <circle cx="48" cy="38" r="5" fill="var(--color-tn-red, #E70013)" stroke={INK} strokeWidth="1.5" />
                </svg>
              </div>
              <h2 className="font-black text-lg mb-2" style={{ color: INK }}>
                Check your inbox
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: INK_SOFT }}>
                If that email is in our system, you&apos;ll receive a reset link shortly. Check your spam folder if you don&apos;t see it.
              </p>
              {state.manualLink && (
                <div
                  className="text-left mb-4 p-3 rounded-xl"
                  style={{
                    background: "var(--color-warning-soft)",
                    border: "1px solid rgba(245,158,11,0.30)",
                  }}
                >
                  <p className="text-[11px] font-black mb-1.5" style={{ color: "#7C2D12" }}>
                    Email delivery is being verified — use this link directly:
                  </p>
                  <a
                    href={state.manualLink}
                    className="text-[11px] font-bold break-all hover:underline block p-2 rounded-lg"
                    style={{ color: BLUE, background: "rgba(45,16,15,0.04)" }}
                  >
                    {state.manualLink}
                  </a>
                  <p className="text-[11px] mt-1.5" style={{ color: INK_SOFT }}>
                    This link expires in 1 hour. We&apos;re finishing email setup; once it&apos;s done, the link will arrive in your inbox automatically.
                  </p>
                </div>
              )}
              <div
                className="text-left mb-6 p-4 rounded-xl"
                style={{
                  background: "rgba(51,116,133,0.08)",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
              >
                <p className="text-xs font-black mb-1.5" style={{ color: INK }}>
                  Didn&apos;t get the email within 2 minutes?
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: INK_SOFT }}>
                  Call or text us at{" "}
                  <a href="tel:+18185067744" className="font-black hover:underline" style={{ color: BLUE }}>
                    (818) 506-7744
                  </a>{" "}
                  and we&apos;ll send you a reset link directly. Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                  color: CREAM,
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-black text-lg mb-1" style={{ color: INK }}>
                Forgot password?
              </h2>
              <p className="text-sm mb-6" style={{ color: INK_SOFT }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

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
                <div>
                  <label
                    className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5"
                    style={{ color: INK_SOFT }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
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
                  {pending ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="text-center text-xs mt-6" style={{ color: INK_FAINT }}>
                Remember it?{" "}
                <Link href="/login" className="font-black hover:underline" style={{ color: BLUE }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
