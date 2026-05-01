"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { useActionState } from "react";

const STORAGE_KEY = "noho-exit-intent-shown";
const SUPPRESS_HOURS = 72; // don't re-show for 3 days after dismissal

export default function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  // `dismissed` permanently disarms the popup for this page lifetime.
  // Without this flag the mouseout/escape listeners would re-fire indefinitely
  // even after the user closes the popup, causing it to reopen on every
  // subsequent cursor exit. localStorage suppresses on the *next* page load,
  // not the current one — that's what this state covers.
  const [dismissed, setDismissed] = useState(false);
  const [armed, setArmed] = useState(false);

  // Initial check + arm timer. Runs once. If the user already dismissed in the
  // last SUPPRESS_HOURS, we never arm at all.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = localStorage.getItem(STORAGE_KEY);
    if (last) {
      const ts = parseInt(last, 10);
      if (Date.now() - ts < SUPPRESS_HOURS * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }
    const armTimer = setTimeout(() => setArmed(true), 5000);
    return () => clearTimeout(armTimer);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable (private mode, quota) — in-memory dismiss
      // still holds for the current tab via the dismissed flag.
    }
  }, []);

  useEffect(() => {
    if (!armed || dismissed) return;

    function onMouseOut(e: MouseEvent) {
      // Cursor moves out the top of the viewport AND e.relatedTarget is null
      // (true exit, not just hovering over an iframe or input).
      if (e.clientY <= 0 && !e.relatedTarget) {
        setOpen(true);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed, dismissed, dismiss]);

  if (!open) return null;

  return <ExitIntentDialog onDismiss={dismiss} />;
}

function ExitIntentDialog({ onDismiss }: { onDismiss: () => void }) {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    {}
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-heading"
      style={{
        background: "rgba(45,16,15,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onDismiss}
    >
      <div
        className="relative max-w-md w-full rounded-3xl p-8 animate-scale-in"
        style={{
          background:
            "linear-gradient(145deg, #FFFFFF 0%, #FFF9F3 100%)",
          boxShadow: "0 30px 80px rgba(45,16,15,0.4)",
          border: "1px solid #E8D8C4",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
          aria-label="Dismiss"
          style={{ color: "#7A6050", fontSize: "20px", lineHeight: 1 }}
        >
          ×
        </button>

        <div
          className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4"
          style={{
            background: "rgba(245,166,35,0.15)",
            color: "#F5A623",
            border: "1px solid rgba(245,166,35,0.3)",
          }}
        >
          One last thing
        </div>

        <h2
          id="exit-intent-heading"
          className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
          style={{ color: "#2D100F" }}
        >
          Before you go — get $5 off your first delivery
        </h2>
        <p
          className="text-sm leading-relaxed mb-5"
          style={{ color: "#7A6050" }}
        >
          Drop your email and we&apos;ll send you a $5 credit you can apply to any
          same-day delivery, plus our monthly small-business newsletter (1 email,
          no spam).
        </p>

        {state.success ? (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            <p className="font-bold text-sm mb-1" style={{ color: "#15803d" }}>
              ✓ You&apos;re in!
            </p>
            <p className="text-xs" style={{ color: "#15803d" }}>
              Check your inbox in the next few minutes for your code.
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 text-xs font-bold underline"
              style={{ color: "#7A6050" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="source" value="exit-intent" />
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none"
              style={{
                border: "2px solid #D8C8B4",
                background: "#FFFFFF",
                color: "#2D100F",
              }}
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: "#337485" }}
            >
              {pending ? "Subscribing…" : "Send me the $5 credit"}
            </button>
            {state.error && (
              <p className="text-xs" style={{ color: "#dc2626" }}>{state.error}</p>
            )}
            <p
              className="text-[10px] text-center"
              style={{ color: "rgba(122,96,80,0.7)" }}
            >
              Reply STOP any time to opt out. No third-party sharing.
            </p>
          </form>
        )}

        <div
          className="mt-5 pt-5 text-center"
          style={{ borderTop: "1px solid #E8D8C4" }}
        >
          <p className="text-xs" style={{ color: "rgba(122,96,80,0.7)" }}>
            Or skip this and see our pricing →
          </p>
          <Link
            href="/pricing"
            onClick={onDismiss}
            className="inline-block mt-1.5 font-bold text-sm hover:underline"
            style={{ color: "#337485" }}
          >
            View mailbox plans
          </Link>
        </div>
      </div>
    </div>
  );
}
