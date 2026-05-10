"use client";

/**
 * iter-195 — Bureau lobby digital signage (Tier 13 #104).
 *
 * Wall-mounted iPad client. Polls /lobby/data every 30s for fresh
 * appointments + tours + open-status. Designed for landscape
 * full-screen Safari/Chrome — uses big readable type, dim/dark
 * backdrop so the iPad doesn't burn in or hurt eyes after-hours,
 * and a slow marquee at the bottom for status announcements.
 *
 * Privacy: only initials surface (e.g. "K.S.") — no full names, no
 * package counts beyond a coarse bucket. The kiosk is shared so PII
 * exposure has to be tight.
 */

import { useEffect, useMemo, useState } from "react";
import { getLobbyBoardData, type LobbyBoardData, type LobbyAppointmentRow } from "@/app/actions/lobbyBoard";

const REFRESH_MS = 30_000;

export default function LobbyBoard() {
  const [data, setData] = useState<LobbyBoardData | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const d = await getLobbyBoardData();
        if (cancelled) return;
        setData(d);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    void load();
    const id = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => { cancelled = true; clearInterval(id); clearInterval(tick); };
  }, []);

  const clock = useMemo(() => ({
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(now),
    date: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(now),
  }), [now]);

  const accent = data?.isOpen ? "#16A34A" : "#E70013";
  const accentSoft = data?.isOpen ? "rgba(22,163,74,0.18)" : "rgba(231,0,19,0.18)";

  return (
    <div style={S.root}>
      {/* Header — bureau name, clock, open/closed pill */}
      <header style={S.header}>
        <div>
          <p style={S.eyebrow}>Welcome to</p>
          <h1 style={S.bureau}>{data?.bureauName ?? "NOHO Mailbox"}</h1>
        </div>
        <div style={S.clockWrap}>
          <p style={{ ...S.statusPill, background: accentSoft, color: accent, borderColor: `${accent}55` }}>
            <span style={{ ...S.statusDot, background: accent, boxShadow: `0 0 14px ${accent}` }} />
            {data?.isOpen ? "OPEN" : "CLOSED"} {data?.hoursStatus === "closing_soon" && "· closing soon"}
            {data?.hoursStatus === "break" && "· on break"}
            {data?.hoursStatus === "closed_holiday" && "· holiday"}
          </p>
          <p style={S.hours}>{data?.hoursToday ?? "—"}</p>
          <p style={S.clockTime}>{clock.time}</p>
          <p style={S.clockDate}>{clock.date}</p>
        </div>
      </header>

      {/* Hero — next-up appointment, big type */}
      <section style={S.heroWrap}>
        {error ? (
          <p style={{ ...S.heroSub, color: "#fca5a5" }}>Connection error: {error}</p>
        ) : data == null ? (
          <p style={S.heroSub}>Loading lobby board…</p>
        ) : data.appointments.nextUp ? (
          <NextUpHero next={data.appointments.nextUp} />
        ) : (
          <div style={S.heroEmpty}>
            <p style={S.heroEyebrow}>📭 No one in the queue right now</p>
            <p style={S.heroSub}>Walk-ins welcome — please ring the bell at the counter.</p>
          </div>
        )}
      </section>

      {/* Three-column grid — appointments / checked-in / tours */}
      <section style={S.cols}>
        <Column title="📦 Pickup queue" subtitle={`${data?.appointments.upcoming.length ?? 0} upcoming today`}>
          {data?.appointments.upcoming.length ? (
            <ul style={S.list}>
              {data.appointments.upcoming.slice(0, 8).map((a) => <ApptRow key={a.id} a={a} now={now} />)}
            </ul>
          ) : <Empty label="No more appointments today" />}
        </Column>
        <Column title="✓ Checked in" subtitle={`${data?.appointments.checkedIn.length ?? 0} at the counter`} accent="#F59E0B">
          {data?.appointments.checkedIn.length ? (
            <ul style={S.list}>
              {data.appointments.checkedIn.slice(0, 8).map((a) => <ApptRow key={a.id} a={a} now={now} checkedIn />)}
            </ul>
          ) : <Empty label="No one currently checked in" />}
        </Column>
        <Column title="🚪 Tours today" subtitle={`${data?.tours.upcoming.length ?? 0} scheduled`} accent="#7C3AED">
          {data?.tours.upcoming.length ? (
            <ul style={S.list}>
              {data.tours.upcoming.slice(0, 8).map((t) => (
                <li key={t.id} style={S.tourRow}>
                  <span style={S.tourTime}>{t.timeLabel || "—"}</span>
                  <span style={S.tourName}>{t.initials}</span>
                  <span style={S.tourMeta}>
                    party of {t.partySize}
                    {t.status === "Confirmed" && <span style={S.confirmed}> · confirmed</span>}
                    {t.status === "Pending" && <span style={S.pending}> · pending</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Empty label="No tours scheduled" />}
        </Column>
      </section>

      {/* Marquee — slow horizontal scroll of admin-defined ticker lines */}
      {data?.marqueeLines && data.marqueeLines.length > 0 && (
        <footer style={S.marqueeWrap}>
          <div style={S.marqueeInner}>
            {data.marqueeLines.concat(data.marqueeLines).map((line, i) => (
              <span key={i} style={S.marqueeItem}>{line}</span>
            ))}
          </div>
        </footer>
      )}

      <style>{`
        @keyframes marqueeRoll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.04); opacity: 0.92; } }
      `}</style>
    </div>
  );
}

function NextUpHero({ next }: { next: LobbyAppointmentRow }) {
  return (
    <div style={S.heroBox}>
      <p style={S.heroEyebrow}>NEXT UP · {next.scheduledTimeLabel}</p>
      <p style={S.heroInitials}>{next.initials}</p>
      <p style={S.heroSub}>
        {next.status === "checkedIn" ? "Checked in — please head to the counter" : "Please come to the counter to check in"}
        {next.packageHint && ` · ${next.packageHint}`}
      </p>
    </div>
  );
}

function ApptRow({ a, now, checkedIn }: { a: LobbyAppointmentRow; now: Date; checkedIn?: boolean }) {
  const ts = new Date(a.scheduledAtIso).getTime();
  const minsAway = Math.round((ts - now.getTime()) / 60000);
  const due = minsAway <= 0 && minsAway > -30;
  const overdue = minsAway < -30 && !checkedIn;
  return (
    <li style={{ ...S.apptRow, ...(a.isNext ? S.apptRowNext : {}) }}>
      <span style={S.apptTime}>{a.scheduledTimeLabel}</span>
      <span style={S.apptName}>{a.initials}</span>
      <span style={S.apptMeta}>
        {a.packageHint ?? "—"}
        {due && !checkedIn && <span style={S.due}> · DUE NOW</span>}
        {overdue && <span style={S.overdue}> · LATE</span>}
        {checkedIn && <span style={S.checkedIn}> · ready</span>}
      </span>
    </li>
  );
}

function Column({ title, subtitle, accent = "#1976FF", children }: { title: string; subtitle: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={S.col}>
      <header style={S.colHead}>
        <p style={{ ...S.colTitle, color: accent }}>{title}</p>
        <p style={S.colSub}>{subtitle}</p>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p style={S.empty}>{label}</p>;
}

const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0B0F18 0%, #111729 60%, #1A1130 100%)",
    color: "#F4F5F7",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
    padding: "28px 32px 0",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    color: "rgba(244,245,247,0.55)",
    margin: 0,
  },
  bureau: { fontSize: 48, fontWeight: 900, letterSpacing: "-0.02em", margin: "4px 0 0" },
  clockWrap: { textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: "0.20em",
    textTransform: "uppercase",
    margin: 0,
  },
  statusDot: { display: "inline-block", width: 10, height: 10, borderRadius: 999, animation: "pulse 1.6s ease-in-out infinite" },
  hours: { fontSize: 13, color: "rgba(244,245,247,0.65)", margin: 0 },
  clockTime: { fontSize: 56, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", margin: "8px 0 0", color: "#fff" },
  clockDate: { fontSize: 13, color: "rgba(244,245,247,0.55)", margin: 0 },
  heroWrap: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: "32px 28px",
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBox: { textAlign: "center" },
  heroEmpty: { textAlign: "center" },
  heroEyebrow: { fontSize: 14, fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: "#1976FF", margin: 0 },
  heroInitials: { fontSize: 144, fontWeight: 900, letterSpacing: "-0.02em", margin: "8px 0 4px", lineHeight: 1, color: "#fff", animation: "pulse 2.4s ease-in-out infinite" },
  heroSub: { fontSize: 18, color: "rgba(244,245,247,0.78)", margin: 0 },
  cols: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, flex: 1, minHeight: 0 },
  col: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  colHead: { marginBottom: 10 },
  colTitle: { fontSize: 16, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", margin: 0 },
  colSub: { fontSize: 12, color: "rgba(244,245,247,0.55)", margin: "2px 0 0" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 },
  apptRow: {
    display: "grid",
    gridTemplateColumns: "84px 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  apptRowNext: {
    background: "rgba(25,118,255,0.12)",
    border: "1px solid rgba(25,118,255,0.45)",
    boxShadow: "0 0 18px rgba(25,118,255,0.25)",
  },
  apptTime: { fontSize: 14, fontVariantNumeric: "tabular-nums", color: "rgba(244,245,247,0.85)", fontWeight: 800 },
  apptName: { fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" },
  apptMeta: { fontSize: 11, color: "rgba(244,245,247,0.55)", textAlign: "right" },
  due: { color: "#F59E0B", fontWeight: 900 },
  overdue: { color: "#EF4444", fontWeight: 900 },
  checkedIn: { color: "#22C55E", fontWeight: 900 },
  tourRow: {
    display: "grid",
    gridTemplateColumns: "84px 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(124,58,237,0.05)",
    border: "1px solid rgba(124,58,237,0.18)",
  },
  tourTime: { fontSize: 14, fontVariantNumeric: "tabular-nums", color: "rgba(244,245,247,0.85)", fontWeight: 800 },
  tourName: { fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "0.04em" },
  tourMeta: { fontSize: 11, color: "rgba(244,245,247,0.55)", textAlign: "right" },
  confirmed: { color: "#22C55E", fontWeight: 900 },
  pending: { color: "#F59E0B", fontWeight: 900 },
  empty: { fontSize: 13, color: "rgba(244,245,247,0.45)", fontStyle: "italic", padding: "24px 0", textAlign: "center", margin: 0 },
  marqueeWrap: {
    margin: "0 -32px",
    overflow: "hidden",
    background: "rgba(0,0,0,0.30)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 0",
  },
  marqueeInner: {
    display: "inline-flex",
    gap: 64,
    paddingLeft: 32,
    whiteSpace: "nowrap",
    animation: "marqueeRoll 60s linear infinite",
  },
  marqueeItem: { fontSize: 16, fontWeight: 700, color: "rgba(244,245,247,0.78)" },
};
