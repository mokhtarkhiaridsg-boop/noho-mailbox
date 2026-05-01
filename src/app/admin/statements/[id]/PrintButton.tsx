"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: "8px 16px",
        borderRadius: 10,
        background: "#337485",
        color: "white",
        border: "none",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Print / Save as PDF
    </button>
  );
}
