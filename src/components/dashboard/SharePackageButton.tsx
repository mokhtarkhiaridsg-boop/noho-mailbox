"use client";

// iter-93 — Lazy share button for member PackagesPanel.
//
// Defers token minting until first click — most packages will never get
// shared so we don't want to pollute the DB. On click:
//   1. ensureMailPublicShareToken (idempotent)
//   2. Build /p/{id}?t={token}
//   3. Native Web Share if available, else clipboard copy

import { useState, useTransition } from "react";
import { ensureMailPublicShareToken } from "@/app/actions/mail";
import { BRAND } from "./types";

export default function SharePackageButton({ mailItemId, packageFrom }: { mailItemId: string; packageFrom: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null); setCopied(false);
    startTransition(async () => {
      const res = await ensureMailPublicShareToken(mailItemId);
      if ((res as { error?: string }).error || !(res as { token?: string }).token) {
        setError((res as { error?: string }).error ?? "Couldn't share.");
        return;
      }
      const token = (res as { token: string }).token;
      const url = `${window.location.origin}/p/${mailItemId}?t=${token}`;
      const shareData = {
        title: "NOHO Mailbox tracking",
        text: `Tracking for "${packageFrom}" via NOHO Mailbox`,
        url,
      };
      // Native Web Share (mobile, modern desktop) — if user cancels we
      // catch silently.
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        try {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData);
          return;
        } catch {
          // user cancelled or browser blocked — fall through to clipboard
        }
      }
      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      } catch {
        setError(`Copy this link: ${url}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
      style={{
        background: copied ? "rgba(22,163,74,0.10)" : "white",
        color: copied ? "#15803d" : BRAND.blueDeep,
        border: `1px solid ${copied ? "rgba(22,163,74,0.40)" : BRAND.border}`,
      }}
      title="Share a public tracking page for this package"
    >
      {pending ? "…" : copied ? "Copied ✓" : error ? "Try again" : "Share"}
    </button>
  );
}
