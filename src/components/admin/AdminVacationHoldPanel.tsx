"use client";

// iter-89 — Active vacation holds + admin tooling.
//
// Shows every active hold with:
//   - Customer name + suite
//   - Date window (with auto color: gray = future, amber = active, red = expired-but-not-resumed)
//   - Held-package count
//   - "End now" button (admin can resume early; flips packages back to
//     Awaiting Pickup, sends end-email, audit logs)
// Header has "Run auto-resume now" button so admin can trigger the cron
// manually after a date change or test.

import { useEffect, useState, useTransition } from "react";
import {
  listActiveVacationHolds,
  adminEndVacationHold,
  runVacationHoldAutoResume,
} from "@/app/actions/mailPreferences";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

type HoldRow = Awaited<ReturnType<typeof listActiveVacationHolds>>[number];

export default function AdminVacationHoldPanel() {
  const [rows, setRows] = useState<HoldRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void listActiveVacationHolds().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  function endNow(holdId: string, name: string | null) {
    if (!confirm(`End ${name ?? "customer"}'s vacation hold now? Their Held packages flip to Awaiting Pickup and the customer gets an email.`)) return;
    setMsg(null);
    startTransition(async () => {
      const res = await adminEndVacationHold(holdId);
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      const released = (res as { packagesReleased?: number }).packagesReleased ?? 0;
      setMsg(`✓ Hold ended · ${released} package${released === 1 ? "" : "s"} released to Awaiting Pickup`);
      refresh();
    });
  }

  function runResume() {
    setMsg(null);
    startTransition(async () => {
      const res = await runVacationHoldAutoResume();
      setMsg(`✓ Resume sweep · ${res.holdsResumed} hold${res.holdsResumed === 1 ? "" : "s"} resumed · ${res.packagesReleased} package${res.packagesReleased === 1 ? "" : "s"} released${res.errors.length ? ` · ${res.errors.length} errors` : ""}`);
      refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2
            className="text-2xl font-bold"
            style={{
              color: "#1A1D23",
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
            }}
          >
            Vacation Holds
          </h2>
          <span
            className="text-[15px] hidden sm:inline"
            style={{
              color: "#1976FF",
              fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
              transform: "translateY(-1px)",
              display: "inline-block",
            }}
          >
            out of office
          </span>
          <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
            · {rows ? `${rows.length} active hold${rows.length === 1 ? "" : "s"}` : "loading"}
          </span>
        </div>
        <button
          type="button"
          onClick={runResume}
          disabled={pending}
          className="px-3 py-2 rounded-xl text-[11px] font-bold border self-center disabled:opacity-50"
          style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}
          title="Sweep all expired holds and release Held packages to Awaiting Pickup"
        >
          Run auto-resume now
        </button>
      </div>

      {msg && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
            border: `1px solid ${msg.startsWith("✓") ? "rgba(22,163,74,0.30)" : "rgba(231,0,19,0.30)"}`,
          }}
        >
          {msg}
        </div>
      )}

      {rows === null ? (
        <p className="text-sm" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-5 flex items-center gap-3"
          style={{ borderColor: "rgba(22,163,74,0.40)", background: "rgba(22,163,74,0.04)" }}
        >
          <span className="inline-block w-8 h-8 rounded-full flex items-center justify-center text-base font-black text-white shrink-0" style={{ background: "#22C55E" }}>✓</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#15803d" }}>
              No active holds
            </p>
            <p className="text-[12px] font-bold mt-0.5" style={{ color: NOHO_INK }}>
              Nobody's on vacation right now.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((h) => {
            const status: "future" | "active" | "expired" =
              h.startDate > today ? "future" :
              h.endDate < today ? "expired" : "active";
            const statusColor =
              status === "expired" ? { bg: "rgba(231,0,19,0.10)", fg: "#991b1b", label: "Expired · awaiting cron" } :
              status === "active"  ? { bg: "rgba(245,166,35,0.14)", fg: "#92400e", label: "On hold now" } :
                                     { bg: "rgba(45,16,15,0.06)", fg: "rgba(45,16,15,0.55)", label: "Future" };
            return (
              <li
                key={h.id}
                className="rounded-md bg-white p-4 flex items-center gap-3 flex-wrap"
                style={{ border: "1px solid #ECEEF1" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-black truncate flex items-center gap-2 flex-wrap" style={{ color: NOHO_INK }}>
                    <span>{h.customerName ?? "—"}</span>
                    {h.suiteNumber && (
                      <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        Suite #{h.suiteNumber}
                      </span>
                    )}
                    <span
                      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: statusColor.bg, color: statusColor.fg }}
                    >
                      {statusColor.label}
                    </span>
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {h.startDate} → {h.endDate}
                    {h.digest && <span style={{ marginLeft: 6 }}>· daily digest</span>}
                    <span style={{ marginLeft: 6, color: "rgba(45,16,15,0.40)" }}>· {h.customerEmail}</span>
                  </p>
                </div>
                <span
                  className="text-[12.5px] font-black px-2.5 py-1 rounded shrink-0"
                  style={{
                    background: h.heldPackageCount > 0 ? "rgba(245,166,35,0.14)" : "rgba(45,16,15,0.06)",
                    color: h.heldPackageCount > 0 ? "#92400e" : "rgba(45,16,15,0.55)",
                  }}
                >
                  {h.heldPackageCount} held
                </span>
                <button
                  type="button"
                  onClick={() => endNow(h.id, h.customerName)}
                  disabled={pending}
                  className="px-3 py-2 rounded-lg text-[11px] font-black text-white shrink-0 disabled:opacity-50"
                  style={{ background: NOHO_BLUE_DEEP }}
                >
                  End hold now →
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
