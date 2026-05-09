"use client";

/**
 * iter-161 — PWA install prompt (Tier 10 #71).
 *
 * Friendly "Add to home screen" prompt that:
 *   - Counts the user's distinct visit days in localStorage
 *   - Captures `beforeinstallprompt` (Chrome / Edge / Android) and
 *     defers it so we can fire on our schedule, not the browser's
 *   - Shows a branded sheet at the bottom of the screen after THREE
 *     distinct visit days, never sooner
 *   - On iOS Safari (no beforeinstallprompt), shows a fallback
 *     instruction sheet with the Share → Add to Home Screen pattern
 *   - Hides forever once the user installs (`appinstalled` event)
 *     OR clicks Dismiss (sticky for 60 days)
 *
 * Mounted on both the member and admin shells so each surface gets
 * its own prompt.
 */

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "noho-pwa-dismiss-v1";
const VISIT_DAYS_KEY = "noho-pwa-visit-days-v1";
const MIN_VISIT_DAYS = 3;
const DISMISS_TTL_DAYS = 60;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function recordVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(VISIT_DAYS_KEY);
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    set.add(todayKey());
    // Cap at 30 distinct keys — we only ever check ≥3.
    const arr = Array.from(set).slice(-30);
    window.localStorage.setItem(VISIT_DAYS_KEY, JSON.stringify(arr));
    return arr.length;
  } catch { return 0; }
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const ts = window.localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ageMs = Date.now() - parseInt(ts, 10);
    return ageMs >= 0 && ageMs < DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function markDismissed() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* quota */ }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // Chrome / desktop / Android
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari
  const w = window as unknown as { navigator?: { standalone?: boolean } };
  if (w.navigator?.standalone === true) return true;
  return false;
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !/Windows/.test(ua);
  const isSafari = /^((?!chrome|crios|fxios|edgios).)*safari/i.test(ua);
  return isIos && isSafari;
}

export default function PwaInstallPrompt() {
  const [show, setShow] = useState(false);
  const [iosFallback, setIosFallback] = useState(false);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;          // already installed
    if (isDismissed()) return;            // user opted out

    const visits = recordVisit();
    const okByVisits = visits >= MIN_VISIT_DAYS;

    function onBeforeInstall(e: Event) {
      e.preventDefault();                 // defer the browser's native prompt
      setDeferred(e as InstallPromptEvent);
      if (okByVisits) setShow(true);
    }
    function onInstalled() {
      setShow(false);
      setDeferred(null);
      markDismissed();                    // never show again on this device
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS fallback — Safari never fires beforeinstallprompt; show our
    // own instructional card after the same 3-visit threshold.
    if (okByVisits && isIosSafari()) {
      setIosFallback(true);
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
        setDeferred(null);
        // appinstalled handler will mark dismissed too — belt and suspenders
        markDismissed();
      } else {
        setShow(false);
        markDismissed();
      }
    } catch {
      setShow(false);
    }
  }

  function onDismiss() {
    markDismissed();
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        zIndex: 1000,
        left: 12, right: 12, bottom: 12,
        maxWidth: 420,
        margin: "0 auto",
        background: "linear-gradient(135deg, #337485, #23596A)",
        color: "white",
        borderRadius: 18,
        boxShadow: "0 18px 40px rgba(15,23,42,0.25)",
        padding: 16,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
      }}
      role="dialog"
      aria-label="Install NOHO Mailbox app"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 12, background: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}
          aria-hidden
        >
          📲
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.85 }}>
            Add to home screen
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, letterSpacing: "-0.005em" }}>
            One-tap access to your mailbox
          </p>
          {iosFallback ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.92, lineHeight: 1.5 }}>
              In Safari: tap the <strong>Share</strong> icon (square with up-arrow) → <strong>Add to Home Screen</strong>.
            </p>
          ) : (
            <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.92, lineHeight: 1.5 }}>
              Skip the browser tabs — install NOHO Mailbox as a real app.
            </p>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {!iosFallback && (
              <button
                type="button"
                onClick={onInstall}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "white",
                  color: "#23596A",
                  fontWeight: 800,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              style={{
                flex: iosFallback ? 1 : "none",
                padding: "9px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                color: "white",
                fontWeight: 700,
                fontSize: 11,
                border: "1px solid rgba(255,255,255,0.20)",
                cursor: "pointer",
              }}
            >
              {iosFallback ? "Got it" : "Not now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
