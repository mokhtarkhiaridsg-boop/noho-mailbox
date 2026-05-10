"use client";

import { useEffect } from "react";

/**
 * iter-203 — Fires window.print() once on mount. Same pattern as
 * iter-155's thermal-receipt AutoPrint. 350ms delay gives the
 * browser time to load all evidence images before the print preview
 * snapshots them — claim PDFs without their photos are useless.
 */
export default function AutoPrint() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, []);
  return null;
}
