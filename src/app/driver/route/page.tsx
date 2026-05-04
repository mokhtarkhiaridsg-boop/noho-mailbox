// iter-97 — Today's driver route. Phone-first layout, big tap targets.

import Link from "next/link";
import { getMyDriverRoute } from "@/app/actions/driver";
import RouteAdvanceButton from "./RouteAdvanceButton";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  Pending:      { bg: "rgba(45,16,15,0.06)",  fg: NOHO_INK, label: "Queued · pickup at NOHO" },
  "Picked Up":  { bg: "rgba(245,166,35,0.14)", fg: "#92400e", label: "Picked up · ready to drive" },
  "In Transit": { bg: "rgba(51,116,133,0.14)", fg: NOHO_BLUE_DEEP, label: "In transit" },
  Delivered:    { bg: "rgba(22,163,74,0.14)",  fg: "#15803d", label: "Delivered ✓" },
};

export default async function DriverRoutePage() {
  const route = await getMyDriverRoute();
  const active = route.filter((r) => r.status !== "Delivered");
  const done = route.filter((r) => r.status === "Delivered");

  return (
    <div style={{ padding: "20px 14px 80px", color: NOHO_INK, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "linear-gradient(180deg, #F8F2EA 80%, transparent)",
          padding: "8px 0 14px",
          marginBottom: 14,
        }}
      >
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
          NOHO Driver · today's route
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.01em" }}>
          {active.length === 0 ? "All clear ✓" : `${active.length} stop${active.length === 1 ? "" : "s"} to go`}
        </h1>
        {done.length > 0 && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
            {done.length} delivered earlier today
          </p>
        )}
      </div>

      {active.length === 0 && done.length === 0 && (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            border: "2px dashed rgba(45,16,15,0.15)",
            borderRadius: 14,
            color: "rgba(45,16,15,0.55)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>No deliveries assigned to you right now.</p>
          <p style={{ margin: "6px 0 0", fontSize: 12 }}>Bureau admin assigns drivers from the admin panel.</p>
        </div>
      )}

      {/* Active stops */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {active.map((r) => {
          const stl = STATUS_STYLES[r.status] ?? { bg: "rgba(45,16,15,0.06)", fg: NOHO_INK, label: r.status };
          return (
            <li
              key={r.id}
              style={{
                background: "white",
                border: "1px solid rgba(45,16,15,0.10)",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 4px 14px rgba(45,16,15,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 900,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: stl.bg,
                    color: stl.fg,
                  }}
                >
                  {stl.label}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: r.tier === "Rush" || r.tier === "WhiteGlove" ? "rgba(231,0,19,0.10)" : "rgba(45,16,15,0.06)",
                    color: r.tier === "Rush" || r.tier === "WhiteGlove" ? "#991b1b" : "rgba(45,16,15,0.55)",
                  }}
                >
                  {r.tier}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: NOHO_INK }}>{r.customerName}</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: NOHO_INK }}>{r.destination}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
                {r.zip} · {r.zone} · {r.itemType}
              </p>
              {r.instructions && (
                <p style={{ margin: "6px 0 0", padding: "6px 10px", background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)", borderRadius: 6, fontSize: 12, fontStyle: "italic", color: "#92400e" }}>
                  {r.instructions}
                </p>
              )}

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={`tel:${r.phone}`} style={{ flex: 1, minWidth: 100, padding: "10px 12px", borderRadius: 10, background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP, textDecoration: "none", fontWeight: 800, fontSize: 12, textAlign: "center" }}>
                  Call
                </a>
                <a
                  href={`https://maps.apple.com/?daddr=${encodeURIComponent(r.destination + " " + r.zip)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, minWidth: 100, padding: "10px 12px", borderRadius: 10, background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP, textDecoration: "none", fontWeight: 800, fontSize: 12, textAlign: "center" }}
                >
                  Navigate
                </a>
                {r.status === "In Transit" ? (
                  <Link
                    href={`/driver/deliver/${r.id}`}
                    style={{ flex: 2, minWidth: 140, padding: "10px 14px", borderRadius: 10, background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, color: "white", textDecoration: "none", fontWeight: 900, fontSize: 13, textAlign: "center" }}
                  >
                    Deliver →
                  </Link>
                ) : (
                  <RouteAdvanceButton id={r.id} currentStatus={r.status} />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Done today */}
      {done.length > 0 && (
        <>
          <p style={{ margin: "24px 0 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
            Delivered today
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {done.map((r) => (
              <li
                key={r.id}
                style={{
                  background: "white",
                  border: "1px solid rgba(45,16,15,0.06)",
                  borderRadius: 12,
                  padding: 12,
                  opacity: 0.85,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: NOHO_INK, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#15803d" }}>✓</span> {r.customerName}
                  {r.recipientName && <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(45,16,15,0.55)" }}>· received by {r.recipientName}</span>}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>
                  {r.destination} · {r.deliveredAtIso && new Date(r.deliveredAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
