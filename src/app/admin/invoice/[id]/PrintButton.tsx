"use client";

/**
 * Tiny client island just for the "Print invoice" toolbar button. Lives
 * separately so the parent page can stay a Server Component (and avoid
 * shipping the database / verifyAdmin code to the browser).
 *
 * Also auto-fires window.print() when the URL has ?print=1, so admins can
 * open `/admin/invoice/<id>?print=1` in a new tab and the print dialog
 * comes up by itself — same trick the legacy receipt route uses.
 */
import { useEffect } from "react";

export default function PrintButton() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      style={{
        padding: "10px 18px",
        borderRadius: 14,
        background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
        color: "#F7E6C2",
        fontSize: 12,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
      }}
    >
      Print invoice
    </button>
  );
}
