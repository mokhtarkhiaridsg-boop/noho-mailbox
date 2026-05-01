"use client";

/**
 * Shared "Share this tracking page" button used by /r/[id] and /r/po/[id].
 *
 * Uses the Web Share API when available (modern iOS, Android, Edge desktop)
 * so the customer gets the native share sheet to forward via Messages,
 * WhatsApp, Mail, etc. Falls back to clipboard-copy with a "Copied ✓"
 * toast-style feedback for browsers without the API (older desktop Safari /
 * Firefox).
 */

import { useEffect, useState } from "react";

type Props = {
  url: string;
  title?: string;
  text?: string;
  brandColor?: string;
  className?: string;
};

export default function PublicShareButton({
  url,
  title = "NOHO Mailbox tracking",
  text,
  brandColor = "#337485",
  className,
}: Props) {
  const [supportsShare, setSupportsShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // navigator.share is undefined on older browsers; check at mount so the
    // server-rendered HTML doesn't depend on it.
    setSupportsShare(typeof navigator !== "undefined" && typeof (navigator as { share?: unknown }).share === "function");
  }, []);

  async function handle() {
    if (supportsShare && typeof (navigator as { share?: (data: ShareData) => Promise<void> }).share === "function") {
      try {
        await (navigator as { share: (data: ShareData) => Promise<void> }).share({ url, title, text: text ?? title });
        return;
      } catch {
        // User cancelled or permission denied — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard API either — use a final-fallback prompt so the user
      // can still grab the URL.
      if (typeof window !== "undefined") {
        window.prompt("Copy this link:", url);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 10,
        border: `1px solid ${brandColor}`,
        background: "white",
        color: brandColor,
        fontWeight: 800,
        fontSize: 12,
        cursor: "pointer",
      }}
      aria-label="Share this tracking page"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.2 13.3 L15.8 17.7 M15.8 6.3 L8.2 10.7" />
      </svg>
      {copied ? "Copied ✓" : supportsShare ? "Share" : "Copy link"}
    </button>
  );
}
