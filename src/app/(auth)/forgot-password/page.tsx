"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "@/app/actions/password-reset";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    {}
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-bg-dark relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4 drop-shadow-2xl" />
          </Link>
          <p className="text-text-dark-muted text-sm">Reset your password</p>
        </div>

        <div className="animate-fade-up delay-100 rounded-2xl p-8 bg-white/[0.04] border border-white/[0.08] shadow-[0_4px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {state.success ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-text-dark font-bold text-lg mb-2">Check your inbox</h2>
              <p className="text-text-dark-muted text-sm leading-relaxed mb-6">
                If that email is in our system, you'll receive a reset link shortly. Check your spam folder if you don't see it.
              </p>
              <Link
                href="/login"
                className="block w-full text-center font-semibold py-3 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-text-dark font-bold text-lg mb-1">Forgot password?</h2>
              <p className="text-text-dark-muted text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              {state.error && (
                <div className="mb-4 text-danger text-xs font-semibold p-3 rounded-xl bg-danger/10 border border-danger/20">
                  {state.error}
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-dark-muted mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="block w-full text-center font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)] disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="text-center text-xs text-text-dark-muted mt-6">
                Remember it?{" "}
                <Link href="/login" className="text-accent font-semibold hover:underline">
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
