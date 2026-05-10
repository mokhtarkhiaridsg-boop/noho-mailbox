"use client";

import Link from "next/link";

export default function PrintButton() {
  return (
    <div className="no-print" style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      <button type="button" onClick={() => window.print()} style={{
        background: "#337485", color: "white", fontWeight: 900, fontSize: 14,
        border: "none", padding: "12px 24px", borderRadius: 12, cursor: "pointer",
      }}>
        🖨 Print 4×6 receipt
      </button>
      <Link href="/dropoff" style={{
        background: "white", color: "#2D100F", fontWeight: 700, fontSize: 13,
        border: "1px solid rgba(45,16,15,0.15)", padding: "12px 24px", borderRadius: 12, textDecoration: "none",
      }}>
        ＋ New code
      </Link>
    </div>
  );
}
