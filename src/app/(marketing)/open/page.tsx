/**
 * iter-154 — Public live "open / closed" landing page (Tier 9 #64).
 *
 * Server-rendered page that shows whether the bureau is open right
 * now, today's hours, who's on duty, queue depth, and the full week
 * of hours. Re-fetched fresh on every request — meaningful because
 * the live status changes minute-by-minute.
 */

import { getLiveBureauStatus } from "@/app/actions/liveBureau";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Are we open? · NOHO Mailbox",
  description: "Live status for NOHO Mailbox in North Hollywood, CA. Check if we're open now and see today's hours.",
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

export default async function LiveOpenPage() {
  const live = await getLiveBureauStatus();

  const isOpen = live.status === "open" || live.status === "closing_soon";
  const accent = isOpen ? "#15803d" : live.status === "closing_soon" ? "#92400e" : "#991b1b";
  const accentBg = isOpen ? "rgba(34,197,94,0.12)" : live.status === "closing_soon" ? "rgba(245,158,11,0.14)" : "rgba(231,0,19,0.08)";
  const headline =
    live.status === "open" ? "We're open right now." :
    live.status === "closing_soon" ? "We're open — closing soon." :
    live.status === "closed_holiday" ? "Closed for the holiday." :
    "Closed right now.";

  const subhead = (() => {
    if (live.status === "open" || live.status === "closing_soon") {
      const left = live.minutesUntilClose ?? 0;
      const h = Math.floor(left / 60);
      const m = left % 60;
      const leftText = h > 0 ? `${h}h ${m}m` : `${m}m`;
      return `Today: ${live.todayLabel} · ${leftText} until close`;
    }
    if (live.holidayLabel) return live.holidayLabel + " — back soon.";
    return `Today's hours: ${live.todayLabel}`;
  })();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFFCF3 0%, #FFF6E6 100%)",
        padding: "48px 16px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: NOHO_INK,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Hero */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: "white",
            border: "1px solid rgba(45,16,15,0.08)",
            padding: "36px 32px",
            boxShadow: "0 18px 40px rgba(45,16,15,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: accentBg, color: accent,
                fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
                padding: "6px 14px", borderRadius: 999,
              }}
            >
              <span
                style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: 999,
                  background: accent,
                  boxShadow: isOpen ? `0 0 12px ${accent}` : "none",
                  animation: isOpen ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              />
              <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }`}</style>
              {isOpen ? "Live" : "Status"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(45,16,15,0.55)" }}>
              {new Date(live.generatedAtIso).toLocaleString("en-US", { timeZone: live.timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} {live.timezone.replace(/_/g, " ")}
            </span>
          </div>

          <h1
            style={{
              margin: "20px 0 6px",
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: accent,
            }}
          >
            {headline}
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: NOHO_INK, fontWeight: 600 }}>
            {subhead}
          </p>

          {/* Staff + queue strip */}
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(51,116,133,0.08)", border: "1px solid rgba(51,116,133,0.18)" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
                On duty
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 900, color: NOHO_INK }}>
                {live.staffOnDuty ? `${live.staffOnDuty} is here for you` : isOpen ? "Walk in any time" : "Back later — see hours"}
              </p>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(45,16,15,0.04)", border: "1px solid rgba(45,16,15,0.10)" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
                Pickups waiting
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 900, color: NOHO_INK }}>
                {live.awaitingPickupCount} {live.awaitingPickupCount === 1 ? "package" : "packages"}
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href="https://maps.google.com/?q=5062+Lankershim+Blvd,+North+Hollywood,+CA+91601"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: NOHO_BLUE, color: "white",
                padding: "12px 22px", borderRadius: 12, fontWeight: 800, fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(51,116,133,0.32)",
              }}
            >
              📍 Directions
            </a>
            <a
              href="tel:+18185067744"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "white", color: NOHO_BLUE_DEEP,
                padding: "12px 22px", borderRadius: 12, fontWeight: 800, fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(51,116,133,0.30)",
              }}
            >
              📞 (818) 506-7744
            </a>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "white", color: NOHO_INK,
                padding: "12px 22px", borderRadius: 12, fontWeight: 800, fontSize: 14,
                textDecoration: "none",
                border: "1px solid rgba(45,16,15,0.15)",
              }}
            >
              My dashboard
            </Link>
          </div>
        </section>

        {/* Hours table */}
        <section
          style={{
            marginTop: 24,
            borderRadius: 24,
            background: "white",
            border: "1px solid rgba(45,16,15,0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(45,16,15,0.08)", background: NOHO_CREAM }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
              This week
            </p>
            <h2 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: NOHO_INK }}>
              5062 Lankershim Blvd · North Hollywood, CA 91601
            </h2>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {live.weeklyHours.map((day) => (
              <li
                key={day.day}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderTop: "1px solid rgba(45,16,15,0.06)",
                  background: day.isToday ? "rgba(51,116,133,0.06)" : "white",
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: day.isToday ? 900 : 600,
                  color: day.isToday ? NOHO_BLUE_DEEP : NOHO_INK,
                }}>
                  {day.day}
                  {day.isToday && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: NOHO_BLUE,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(51,116,133,0.12)",
                    }}>
                      Today
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: day.open ? NOHO_INK : "rgba(45,16,15,0.45)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {day.hours}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p style={{ marginTop: 18, fontSize: 11, color: "rgba(45,16,15,0.45)", textAlign: "center", lineHeight: 1.6 }}>
          Live status refreshes when you reload. Holidays may differ — check for closure banners.
          <br/>
          NOHO Mailbox · Private mailbox rental, virtual mail, package handling, mail forwarding.
        </p>
      </div>
    </main>
  );
}
