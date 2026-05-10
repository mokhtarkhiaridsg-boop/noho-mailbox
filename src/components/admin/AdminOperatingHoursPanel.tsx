"use client";

// iter-90 — Admin operating-hours editor.
//
// Two stacked sections:
//   1. Weekly hours grid: 7 day rows with toggle / open / close / break /
//      free-form display label
//   2. Holiday list: add / edit / remove date-keyed exceptions

import { useEffect, useState, useTransition } from "react";
import { DEFAULT_HOURS, type OperatingHoursConfig, type DayHours, type Holiday } from "@/lib/operating-hours";
import AdminStaffOnDutyCard from "./AdminStaffOnDutyCard";
import {
  getOperatingHours,
  updateOperatingHours,
  resetOperatingHours,
  addHoliday,
  removeHoliday,
} from "@/app/actions/operatingHours";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function AdminOperatingHoursPanel() {
  const [cfg, setCfg] = useState<OperatingHoursConfig | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Holiday-add form state
  const [hDate, setHDate] = useState("");
  const [hLabel, setHLabel] = useState("");
  const [hClosed, setHClosed] = useState(true);
  const [hOpen, setHOpen] = useState("10:00");
  const [hClose, setHClose] = useState("13:30");
  const [hNote, setHNote] = useState("");

  function refresh() {
    void getOperatingHours().then(setCfg).catch(() => setCfg(DEFAULT_HOURS));
  }
  useEffect(() => { refresh(); }, []);

  function patchDay(idx: number, patch: Partial<DayHours>) {
    if (!cfg) return;
    const next = { ...cfg, weekly: cfg.weekly.map((d, i) => i === idx ? { ...d, ...patch } : d) as OperatingHoursConfig["weekly"] };
    setCfg(next);
  }

  function save() {
    if (!cfg) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updateOperatingHours(cfg);
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setMsg("✓ Hours saved");
    });
  }

  function reset() {
    if (!confirm("Reset operating hours to defaults?")) return;
    setMsg(null);
    startTransition(async () => {
      await resetOperatingHours();
      refresh();
      setMsg("✓ Reset to defaults");
    });
  }

  function addHol() {
    if (!hDate || !hLabel) {
      setMsg("Date + label required");
      return;
    }
    const holiday: Holiday = {
      date: hDate,
      label: hLabel,
      closed: hClosed,
      openClose: hClosed ? undefined : { open: hOpen, close: hClose },
      note: hNote || undefined,
    };
    startTransition(async () => {
      const res = await addHoliday(holiday);
      if ((res as { error?: string }).error) {
        setMsg((res as { error?: string }).error || "Failed");
        return;
      }
      setMsg("✓ Holiday added");
      setHDate(""); setHLabel(""); setHNote(""); setHClosed(true);
      refresh();
    });
  }

  function deleteHol(date: string) {
    if (!confirm("Remove this holiday?")) return;
    startTransition(async () => {
      await removeHoliday(date);
      refresh();
    });
  }

  if (!cfg) return <p className="text-sm" style={{ color: "rgba(0,0,0,0.55)" }}>Loading…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          System · Operating hours
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Hours of operation</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          Drives the marketing-site Hours block, the open/closed pill on the dashboard, and email signatures. Holiday exceptions override the weekly grid for those dates.
        </p>
      </div>

      {/* iter-154 — Staff on duty card. Drives the public /open page. */}
      <AdminStaffOnDutyCard />

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

      {/* ── Weekly grid ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.40)" }}>
            Weekly hours · timezone <span className="font-mono">{cfg.timezone}</span>
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={reset} disabled={pending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
              style={{ borderColor: "#e8e5e0", color: "rgba(0,0,0,0.65)", background: "white" }}>
              Reset to defaults
            </button>
            <button type="button" onClick={save} disabled={pending}
              className="px-3 h-8 rounded-md text-[10px] font-bold uppercase tracking-[0.10em] text-white disabled:opacity-50 transition-colors"
              style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ color: "rgba(0,0,0,0.55)" }}>
                <th className="text-left pb-2 pr-3 font-black text-[10px] uppercase tracking-wider">Day</th>
                <th className="text-left pb-2 px-2 font-black text-[10px] uppercase tracking-wider">Open</th>
                <th className="text-left pb-2 px-2 font-black text-[10px] uppercase tracking-wider">Close</th>
                <th className="text-left pb-2 px-2 font-black text-[10px] uppercase tracking-wider">Break</th>
                <th className="text-left pb-2 px-2 font-black text-[10px] uppercase tracking-wider">Display label</th>
              </tr>
            </thead>
            <tbody>
              {cfg.weekly.map((d, idx) => (
                <tr key={idx} style={{ borderTop: "1px solid #e8e5e0" }}>
                  <td className="py-2 pr-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={d.open} onChange={(e) => patchDay(idx, { open: e.target.checked })}
                        className="w-3.5 h-3.5 accent-[#1976FF]" />
                      <span className="font-black" style={{ color: NOHO_INK }}>{DAY_LABELS[idx]}</span>
                    </label>
                  </td>
                  <td className="py-2 px-2">
                    <input type="time" value={d.openHHMM ?? ""} onChange={(e) => patchDay(idx, { openHHMM: e.target.value })}
                      disabled={!d.open}
                      className="rounded-lg border px-2 py-1 text-xs font-mono disabled:opacity-40"
                      style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
                  </td>
                  <td className="py-2 px-2">
                    <input type="time" value={d.closeHHMM ?? ""} onChange={(e) => patchDay(idx, { closeHHMM: e.target.value })}
                      disabled={!d.open}
                      className="rounded-lg border px-2 py-1 text-xs font-mono disabled:opacity-40"
                      style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <input type="time" value={d.breakHHMM?.[0] ?? ""}
                        onChange={(e) => patchDay(idx, { breakHHMM: [e.target.value, d.breakHHMM?.[1] ?? ""] })}
                        disabled={!d.open}
                        className="rounded-lg border px-2 py-1 text-xs font-mono w-[5.5rem] disabled:opacity-40"
                        style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
                      <span style={{ color: "rgba(0,0,0,0.40)" }}>–</span>
                      <input type="time" value={d.breakHHMM?.[1] ?? ""}
                        onChange={(e) => patchDay(idx, { breakHHMM: [d.breakHHMM?.[0] ?? "", e.target.value] })}
                        disabled={!d.open}
                        className="rounded-lg border px-2 py-1 text-xs font-mono w-[5.5rem] disabled:opacity-40"
                        style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input type="text" value={d.hours ?? ""}
                      onChange={(e) => patchDay(idx, { hours: e.target.value })}
                      placeholder={d.open ? "e.g. 9:30am–5:30pm" : "Closed"}
                      className="w-full rounded-lg border px-2 py-1 text-xs"
                      style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Holidays ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(0,0,0,0.40)" }}>
          Holiday exceptions ({cfg.holidays.length})
        </p>

        <div className="rounded-xl border p-3 mb-3" style={{ borderColor: "#e8e5e0", background: "rgba(51,116,133,0.04)" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: NOHO_BLUE_DEEP }}>
            Add a holiday
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-xs font-mono"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
            <input type="text" value={hLabel} onChange={(e) => setHLabel(e.target.value)} placeholder="Label · e.g. Thanksgiving"
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: NOHO_INK }}>
              <input type="checkbox" checked={hClosed} onChange={(e) => setHClosed(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#1976FF]" />
              Closed all day
            </label>
            <button type="button" onClick={addHol} disabled={pending}
              className="rounded-lg text-[11px] font-black text-white py-1.5 disabled:opacity-50"
              style={{ background: NOHO_BLUE_DEEP }}>
              Add
            </button>
          </div>
          {!hClosed && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input type="time" value={hOpen} onChange={(e) => setHOpen(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs font-mono"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
              <input type="time" value={hClose} onChange={(e) => setHClose(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs font-mono"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
            </div>
          )}
          <input type="text" value={hNote} onChange={(e) => setHNote(e.target.value)} placeholder="Optional public note"
            className="w-full rounded-lg border px-2 py-1.5 text-xs mt-2"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
        </div>

        {cfg.holidays.length === 0 ? (
          <p className="text-[11.5px]" style={{ color: "rgba(0,0,0,0.45)" }}>
            No holiday exceptions configured.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {cfg.holidays.map((h) => (
              <li key={h.date} className="rounded-lg border px-3 py-2 flex items-center gap-3 flex-wrap" style={{ borderColor: "#e8e5e0", background: "white" }}>
                <span className="text-[11px] font-black px-2 py-0.5 rounded font-mono" style={{ background: "rgba(0,0,0,0.06)", color: NOHO_INK }}>
                  {h.date}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                    {h.label}{" "}
                    <span className="text-[10.5px] font-bold" style={{ color: h.closed ? "#991b1b" : "#15803d" }}>
                      · {h.closed ? "Closed" : `${h.openClose?.open}–${h.openClose?.close}`}
                    </span>
                  </p>
                  {h.note && <p className="text-[10.5px] mt-0.5 italic" style={{ color: "rgba(0,0,0,0.55)" }}>"{h.note}"</p>}
                </div>
                <button type="button" onClick={() => deleteHol(h.date)} disabled={pending}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-bold disabled:opacity-50"
                  style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
