"use client";

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Active: { bg: "rgba(34,139,34,0.12)", color: "#1a8a1a" },
    Expired: { bg: "rgba(200,50,50,0.1)", color: "#c03030" },
    Scanned: { bg: "rgba(51,116,133,0.08)", color: "#1A1714" },
    "Awaiting Pickup": { bg: "rgba(51,116,133,0.15)", color: "#337485" },
    Forwarded: { bg: "rgba(26,23,20,0.06)", color: "rgba(26,23,20,0.5)" },
    "Picked Up": { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Held: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Confirmed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Pending: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    "In Transit": { bg: "rgba(51,116,133,0.15)", color: "#337485" },
    Delivered: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Ready: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Completed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    "Scan Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
    "Forward Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
    "Discard Requested": { bg: "rgba(200,50,50,0.15)", color: "#c03030" },
    "Pickup Requested": { bg: "rgba(224,168,0,0.18)", color: "#a07800" },
  };
  const c = colors[status] || { bg: "rgba(26,23,20,0.06)", color: "rgba(26,23,20,0.5)" };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}
