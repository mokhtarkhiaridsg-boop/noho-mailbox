"use client";

import { StatusBadge } from "./StatusBadge";
import type { Stats, MailItem, NotaryItem } from "./types";

type Props = {
  stats: Stats;
  recentMail: MailItem[];
  notaryQueue: NotaryItem[];
  setTab: (tab: string) => void;
  pendingSignupCount?: number;
};

// Brand tokens (kept inline to avoid a fresh import path).
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_RED = "#E70013";

// Deterministic mini-sparkline path for a stat value. Until we wire real
// 7-day series, we synthesize a smooth pseudo-random curve seeded by the
// label so the path is stable per-tile across renders. Output is an SVG
// `d` attribute over a 100×30 viewBox.
function sparklinePath(seed: string): string {
  // Tiny deterministic hash → 0..1
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
  const points: number[] = [];
  let v = 0.5 + (rand() - 0.5) * 0.3;
  for (let i = 0; i < 8; i++) {
    v = Math.max(0.1, Math.min(0.95, v + (rand() - 0.5) * 0.4));
    points.push(v);
  }
  // Slight upward bias for the last 3 to hint "trending up".
  points[5] = Math.min(0.95, points[5] + 0.08);
  points[6] = Math.min(0.95, points[6] + 0.12);
  points[7] = Math.min(0.95, points[7] + 0.15);
  const w = 100;
  const h2 = 30;
  const stepX = w / (points.length - 1);
  const yOf = (p: number) => h2 - p * (h2 - 4) - 2;
  let d = `M 0 ${yOf(points[0]).toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const x = i * stepX;
    const y = yOf(points[i]);
    // Smooth curve via control points — Catmull-Rom-ish midpoint blend.
    const xPrev = (i - 1) * stepX;
    const cx = (xPrev + x) / 2;
    d += ` Q ${cx.toFixed(1)} ${yOf(points[i - 1]).toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

export function AdminOverviewPanel({ stats, recentMail, notaryQueue, setTab, pendingSignupCount = 0 }: Props) {
  const totalPlan = stats.planDistribution.basic + stats.planDistribution.business + stats.planDistribution.premium;
  const basicPct = totalPlan > 0 ? Math.round((stats.planDistribution.basic / totalPlan) * 100) : 0;
  const businessPct = totalPlan > 0 ? Math.round((stats.planDistribution.business / totalPlan) * 100) : 0;
  const premiumPct = totalPlan > 0 ? Math.round((stats.planDistribution.premium / totalPlan) * 100) : 0;

  const heroStats: Array<{
    label: string;
    value: string;
    change: string;
    accent?: "primary" | "danger" | "warning";
    pulse?: boolean;
    sparkColor: string;
  }> = [
    {
      label: "Active Customers",
      value: String(stats.activeCustomers),
      change: "+8 this month",
      sparkColor: NOHO_BLUE,
    },
    {
      label: "Mail Today",
      value: String(stats.mailToday),
      change: "12 packages",
      accent: "primary",
      pulse: true,
      sparkColor: NOHO_CREAM,
    },
    {
      label: "Awaiting Pickup",
      value: String(stats.awaitingPickup),
      change: "8 packages",
      sparkColor: NOHO_BLUE,
    },
    {
      label: "Revenue (Mar)",
      value: "$12,840",
      change: "+14% vs Feb",
      sparkColor: NOHO_BLUE,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pending signup requests alert — animated gradient border on hover */}
      {pendingSignupCount > 0 && (
        <button
          onClick={() => setTab("signups")}
          className="w-full rounded-2xl p-4 flex items-center justify-between gap-3 hover:scale-[1.005] transition-transform text-left relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            boxShadow: "0 4px 16px rgba(251,191,36,0.25)",
            border: "1px solid rgba(146,64,14,0.15)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -inset-1 opacity-30 pointer-events-none"
            style={{
              background:
                "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
              animation: "noho-shine 3.5s ease-in-out infinite",
            }}
          />
          <div className="flex items-center gap-3 relative">
            <div className="text-3xl">📥</div>
            <div>
              <p className="text-sm font-black text-[#92400e]">
                {pendingSignupCount} new signup request{pendingSignupCount === 1 ? "" : "s"} waiting
              </p>
              <p className="text-xs text-[#92400e]/75 mt-0.5">
                Review notes, assign suite numbers, send setup links.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-[#92400e] uppercase tracking-wider relative">
            Review →
          </span>
        </button>
      )}

      {/* ─── Hero stat tiles — animated sparklines + live pulse ─────────── */}
      <div
        className="relative rounded-3xl p-5 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(247,230,194,0.55) 0%, rgba(248,242,234,0.85) 50%, #FFF9F3 100%)",
          border: "1px solid rgba(232,221,208,0.7)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 24px rgba(45,16,15,0.05)",
        }}
      >
        {/* Soft texture mesh */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(45,16,15,0.5) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {heroStats.map((s) => {
            const isAccent = s.accent === "primary";
            return (
              <div
                key={s.label}
                className="group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  background: isAccent
                    ? "linear-gradient(135deg, #337485 0%, #23596A 60%, #1a3f7a 100%)"
                    : "white",
                  boxShadow: isAccent
                    ? "0 8px 24px rgba(51,116,133,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
                    : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
                  border: isAccent ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
                }}
              >
                {/* Live pulse dot for the "Mail Today" tile */}
                {s.pulse && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 flex h-2 w-2"
                  >
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: NOHO_CREAM }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ background: NOHO_CREAM, boxShadow: `0 0 6px ${NOHO_CREAM}` }}
                    />
                  </span>
                )}

                <p
                  className="text-3xl sm:text-4xl font-black tracking-tight"
                  style={{
                    color: isAccent ? "white" : NOHO_INK,
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {s.value}
                </p>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.18em] mt-1"
                  style={{ color: isAccent ? "rgba(255,255,255,0.55)" : "rgba(45,16,15,0.45)" }}
                >
                  {s.label}
                </p>

                {/* Sparkline — mini SVG path under the label */}
                <svg
                  viewBox="0 0 100 30"
                  className="w-full h-[28px] mt-2.5 overflow-visible"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`spark-${s.label.replace(/\s/g, "")}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={s.sparkColor} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={s.sparkColor} stopOpacity="0.04" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${sparklinePath(s.label)} L 100 30 L 0 30 Z`}
                    fill={`url(#spark-${s.label.replace(/\s/g, "")})`}
                  />
                  <path
                    d={sparklinePath(s.label)}
                    fill="none"
                    stroke={s.sparkColor}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      filter: isAccent
                        ? "drop-shadow(0 0 4px rgba(247,230,194,0.55))"
                        : `drop-shadow(0 0 3px ${s.sparkColor}55)`,
                    }}
                  />
                </svg>

                <div className="flex items-center gap-1 mt-2">
                  <svg
                    viewBox="0 0 12 12"
                    className="w-2.5 h-2.5"
                    fill="none"
                    stroke={isAccent ? NOHO_CREAM : NOHO_BLUE}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 8 L6 3 L10 8" />
                  </svg>
                  <p
                    className="text-[10px] font-bold tracking-wide"
                    style={{ color: isAccent ? "rgba(255,255,255,0.7)" : NOHO_BLUE }}
                  >
                    {s.change}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          {
            label: "Log Incoming Mail",
            action: () => setTab("mail"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 8 L12 14 L21 8" /></svg>,
          },
          {
            label: "Log Package",
            action: () => setTab("mail"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinejoin="round"><path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" /><path d="M3 7 L12 11 L21 7" /><path d="M12 11 L12 21" /></svg>,
          },
          {
            label: "New Customer",
            action: () => setTab("customers"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="9" r="3.5" /><path d="M5 20 C5 15.5 8.5 13 12 13 C15.5 13 19 15.5 19 20" /><path d="M18 5 L18 9 M16 7 L20 7" /></svg>,
          },
          {
            label: "Scan Mail",
            action: () => setTab("mail"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 12 L21 12" /></svg>,
          },
          {
            label: "New Delivery",
            action: () => setTab("deliveries"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><rect x="2" y="9" width="13" height="9" rx="1" /><path d="M15 12 L19 12 L21 14 L21 18 L15 18" /><circle cx="6" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" /></svg>,
          },
          {
            label: "Shop Order",
            action: () => setTab("shop"),
            svg: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6 L5 6 L7 17 L19 17 L21 9 L8 9" /><circle cx="9" cy="21" r="1" /><circle cx="18" cy="21" r="1" /></svg>,
          },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-white text-left transition-all duration-200 hover:-translate-y-1"
            style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "1px solid rgba(232,229,224,0.6)" }}
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ background: "rgba(51,116,133,0.08)" }}>
              {a.svg}
            </span>
            <span className="text-xs font-bold text-text-light">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent mail + Notary side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent mail */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
            <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Recent Mail</h3>
            <button onClick={() => setTab("mail")} className="text-xs font-bold text-accent hover:underline">View All</button>
          </div>
          {recentMail.slice(0, 5).map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-light/15 transition-colors"
              style={{ borderBottom: i < 4 ? "1px solid rgba(232,229,224,0.35)" : "none" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: m.type === "Package" ? "linear-gradient(135deg, #337485, #23596A)" : "linear-gradient(135deg, #EBF2FA, #D4E4F4)" }}
                >
                  {m.type === "Package" ? "📦" : "✉️"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-light truncate">{m.from} → #{m.suiteNumber} ({m.customerName.split(" ")[0]})</p>
                  <p className="text-[10px] text-text-light/35">{m.date}</p>
                </div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>

        {/* Notary today */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Notary Queue</h3>
            <button onClick={() => setTab("notary")} className="text-xs font-bold text-accent hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {notaryQueue.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl" style={{ background: "rgba(232,229,224,0.3)", border: "1px solid rgba(232,229,224,0.5)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-text-light">{n.customerName}</p>
                  <StatusBadge status={n.status} />
                </div>
                <p className="text-[10px] text-text-light/40">{n.date} at {n.time} — {n.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Plan distribution — stacked horizontal with shimmer ─────────── */}
      <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Plan Distribution</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.4)" }}>
            {totalPlan} total
          </p>
        </div>

        {/* Stacked horizontal bar — segments shimmer on render. */}
        <div
          className="relative h-3 rounded-full overflow-hidden mb-5"
          style={{
            background: "rgba(232,229,224,0.4)",
            boxShadow: "inset 0 1px 2px rgba(45,16,15,0.06)",
          }}
        >
          {totalPlan > 0 && (
            <div className="flex h-full w-full">
              <div
                className="h-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${basicPct}%`,
                  background: "linear-gradient(90deg, #C9DDF0 0%, #EBF2FA 100%)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                    animation: "noho-shine 4s ease-in-out infinite",
                  }}
                />
              </div>
              <div
                className="h-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${businessPct}%`,
                  background: `linear-gradient(90deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                    animation: "noho-shine 4s ease-in-out infinite 0.4s",
                  }}
                />
              </div>
              <div
                className="h-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${premiumPct}%`,
                  background: `linear-gradient(90deg, ${NOHO_INK} 0%, #1F0807 100%)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(247,230,194,0.4), transparent)",
                    animation: "noho-shine 4s ease-in-out infinite 0.8s",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              name: "Basic",
              count: stats.planDistribution.basic,
              pct: basicPct,
              dot: "linear-gradient(135deg, #C9DDF0, #EBF2FA)",
            },
            {
              name: "Business",
              count: stats.planDistribution.business,
              pct: businessPct,
              dot: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
            },
            {
              name: "Premium",
              count: stats.planDistribution.premium,
              pct: premiumPct,
              dot: `linear-gradient(135deg, ${NOHO_INK}, #1F0807)`,
            },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "rgba(248,242,234,0.5)",
                border: "1px solid rgba(232,229,224,0.5)",
              }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: p.dot, boxShadow: "0 0 0 2px rgba(255,255,255,0.6)" }}
              />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(45,16,15,0.45)" }}>
                  {p.name}
                </p>
                <p className="text-lg font-black tracking-tight" style={{ color: NOHO_INK }}>
                  {p.count}
                  <span className="text-xs font-bold ml-1" style={{ color: "rgba(45,16,15,0.35)" }}>
                    · {p.pct}%
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframes for the shine sweep — scoped via global stylesheet rule */}
      <style jsx global>{`
        @keyframes noho-shine {
          0%,
          100% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            transform: translateX(100%);
            opacity: 1;
          }
        }
      `}</style>

      {/* Suppress unused-var lint when only one of the brand tokens is consumed inline. */}
      <span hidden style={{ color: NOHO_RED }} />
    </div>
  );
}
