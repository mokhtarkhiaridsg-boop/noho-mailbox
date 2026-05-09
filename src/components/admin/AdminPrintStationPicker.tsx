"use client";

/**
 * iter-155 — Per-station printer-pref picker. Admin sets the friendly
 * station name + the OS printer names to remember (one for receipts,
 * one for 4×6 labels). Stored in localStorage per browser/tablet so
 * each terminal picks its own pair.
 *
 * Browsers can't programmatically pick a printer in the OS dialog
 * (that's a security boundary), but knowing the name helps admin
 * select the right one without thinking.
 */

import { useEffect, useState } from "react";
import { getPrintStationPrefs, setPrintStationPrefs, type PrintStationPrefs } from "@/lib/print-station";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  success: "#22C55E",
};

export default function AdminPrintStationPicker() {
  const [prefs, setPrefs] = useState<PrintStationPrefs>({ stationName: "", receiptPrinter: "", labelPrinter: "" });
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => { setPrefs(getPrintStationPrefs()); }, []);

  function update(patch: Partial<PrintStationPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setPrintStationPrefs(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: T.inkFaint }}>
            Print station · this device
          </p>
          <h3 className="text-base font-black" style={{ color: T.ink }}>
            {prefs.stationName || "Counter (unnamed)"}
          </h3>
          <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
            Stored on this browser/tablet only. The OS print dialog still confirms the device every print — these names just help muscle memory.
          </p>
        </div>
        {savedFlash && (
          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: T.success }}>
            ✓ Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Station name">
          <input
            type="text"
            value={prefs.stationName}
            onChange={(e) => update({ stationName: e.target.value.slice(0, 60) })}
            placeholder="Counter A, Drive-thru, …"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
        </Field>
        <Field label="Receipt printer (80mm)">
          <input
            type="text"
            value={prefs.receiptPrinter}
            onChange={(e) => update({ receiptPrinter: e.target.value.slice(0, 80) })}
            placeholder="e.g. Star TSP100, Epson TM-T20"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
        </Field>
        <Field label="Label printer (4×6)">
          <input
            type="text"
            value={prefs.labelPrinter}
            onChange={(e) => update({ labelPrinter: e.target.value.slice(0, 80) })}
            placeholder="e.g. Jadens, Zebra GK420d"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
