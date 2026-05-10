"use client";

export default function PrintButton() {
  return (
    <div className="no-print" style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => window.print()} style={{
        background: "#337485", color: "white", fontWeight: 900, fontSize: 14,
        border: "none", padding: "12px 28px", borderRadius: 12, cursor: "pointer",
      }}>
        🖨 Print certificate
      </button>
    </div>
  );
}
