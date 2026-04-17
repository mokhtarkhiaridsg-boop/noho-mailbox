"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState } from "react";
import { resetPassword, validateResetToken, type ResetState } from "@/app/actions/password-reset";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
      <div className="text-center text-text-dark-muted text-sm py-8">Verifying link…</div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-text-dark font-bold text-lg mb-2">Link expired</h2>
        <p className="text-text-dark-muted text-sm mb-6">
          This password reset link is invalid or has already been used. Request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center font-semibold py-3 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-text-dark font-bold text-lg mb-2">Password updated!</h2>
        <p className="text-text-dark-muted text-sm mb-6">
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full text-center font-semibold py-3 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-text-dark font-bold text-lg mb-1">Set new password</h2>
      <p className="text-text-dark-muted text-sm mb-6">Choose a strong password (8+ characters).</p>

      {state.error && (
        <div className="mb-4 text-danger text-xs font-semibold p-3 rounded-xl bg-danger/10 border border-danger/20">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block text-xs font-medium text-text-dark-muted mb-1.5">New password</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Confirm password</label>
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            placeholder="Repeat password"
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="block w-full text-center font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)] disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-bg-dark relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4 drop-shadow-2xl" />
          </Link>
        </div>

        <div className="animate-fade-up delay-100 rounded-2xl p-8 bg-white/[0.04] border border-white/[0.08] shadow-[0_4px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <Suspense fallback={<div className="text-center text-text-dark-muted text-sm py-8">Loading…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
