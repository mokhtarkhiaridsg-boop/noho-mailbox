"use client";

import { useEffect } from "react";

/**
 * iter-155 — Fires window.print() once on mount. Server component
 * can't trigger client-side APIs, so we delegate to this thin wrapper.
 * 250ms delay gives the browser time to finish layout + load fonts so
 * the receipt renders cleanly into the print preview.
 */
export default function AutoPrint() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, []);
  return null;
}
