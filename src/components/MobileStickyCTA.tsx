"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "noho-mobile-cta-dismissed";

/**
 * Mobile-only bottom-sticky overlay surfacing the three actions a visitor
 * is most likely to take in-the-moment:
 *
 *   1. Request a mailbox — primary brown CTA (takes the most real estate)
 *   2. Call — direct dial to the storefront, blue square
 *   3. Text — SMS to the same number, cream square
 *
 * Plus a tiny × dismiss anchor in the top-right corner that stashes the
 * preference in localStorage so we don't pester returning users. Hidden on
 * `md:` and up so the desktop CTAs (navbar + in-page) carry the weight.
 *
 * Renders into every page wrapped by /(marketing)/layout.tsx — Visitors
 * scrolling deep into FAQ / tools / glossary still have one tap to talk to
 * us or convert.
 */
export default function MobileStickyCTA() {
  const [hidden, setHidden] = useState(true); // start hidden until we check storage

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) setHidden(false);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="fixed left-3 right-3 z-50 md:hidden"
      style={{
        // Sits above the iOS home-indicator safe-area + keyboard-safe pad.
        bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="region"
      aria-label="Quick contact and signup"
    >
      <div className="relative">
        {/* Dismiss × — floats outside the main pill so it never steals a tap
            from the CTA row. 32px tap target keeps it accessible. */}
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* Safari private mode etc. — fine, just close for the session */
            }
            setHidden(true);
          }}
          aria-label="Dismiss quick contact bar"
          className="absolute -top-2 -right-2 z-10 grid place-items-center rounded-full text-[14px] font-bold leading-none cursor-pointer transition-colors active:scale-95"
          style={{
            width: 28,
            height: 28,
            background: "#FFFFFF",
            color: "#5C4540",
            border: "1px solid #E8DDD0",
            boxShadow: "0 4px 10px rgba(45,16,15,0.18)",
          }}
        >
          ×
        </button>

        <div
          className="rounded-2xl flex items-stretch overflow-hidden"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(45,16,15,0.12)",
            boxShadow: "0 12px 36px rgba(45,16,15,0.20)",
          }}
        >
          {/* Primary CTA — Request a mailbox (brown, takes most width) */}
          <Link
            href="/signup"
            data-ripple="true"
            className="flex-1 flex items-center justify-center gap-2 px-3 font-extrabold text-[14px] cursor-pointer transition-colors active:opacity-90"
            style={{
              background: "#2D100F",
              color: "#F7E6C2",
              minHeight: 48,
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              letterSpacing: "0.005em",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <path d="M3 10 H21" />
              <path d="M8 6 V3 H16 V6" />
            </svg>
            Request a mailbox
          </Link>

          {/* Call — blue square */}
          <a
            href="tel:+18185067744"
            aria-label="Call NOHO Mailbox at (818) 506-7744"
            className="grid place-items-center cursor-pointer transition-colors active:opacity-90"
            style={{
              background: "#337485",
              color: "#FFFFFF",
              width: 48,
              minHeight: 48,
              borderLeft: "1px solid rgba(45,16,15,0.10)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>

          {/* Text/SMS — cream square */}
          <a
            href="sms:+18185067744"
            aria-label="Text NOHO Mailbox at (818) 506-7744"
            className="grid place-items-center cursor-pointer transition-colors active:opacity-90"
            style={{
              background: "#F7E6C2",
              color: "#2D100F",
              width: 48,
              minHeight: 48,
              borderLeft: "1px solid rgba(45,16,15,0.10)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
