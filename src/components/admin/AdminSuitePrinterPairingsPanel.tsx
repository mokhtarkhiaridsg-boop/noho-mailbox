"use client";

/**
 * iter-228 — Suite ↔ printer pairing admin panel (Tier 17 #137).
 *
 * Lists active pairings + add form (suite # + printer picker + auto-
 * intake/pickup toggles) + per-row release button. Hidden nav under
 * Operations.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listSuitePrinterPairings,
  pairSuiteToPrinter,
  releaseSuitePrinterPairing,
  setPairingAutoFlags,
  listAvailablePrinters,
  type SuitePrinterPairingRow,
} from "@/app/actions/suitePrinterPairing";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function AdminSuitePrinterPairingsPanel() {
  const [activeOnly, setActiveOnly] = useState(true);
  const [rows, setRows] = useState<SuitePrinterPairingRow[] | null>(null);
  const [printers, setPrinters] = useState<Array<{ id: string; name: string; serial: string; location: string }> | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newSuite, setNewSuite] = useState("");
  const [newPrinter, setNewPrinter] = useState("");
  const [newAutoIntake, setNewAutoIntake] = useState(true);
  const [newAutoPickup, setNewAutoPickup] = useState(true);
  const [newNotes, setNewNotes] = useState("");

  function refresh() {
    void listSuitePrinterPairings({ activeOnly, limit: 100 }).then(setRows).catch(() => setRows([]));
    if (printers === null) void listAvailablePrinters().then(setPrinters).catch(() => setPrinters([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [activeOnly]);

  function onPair() {
    if (!newSuite.trim() || !newPrinter) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await pairSuiteToPrinter({
        suiteNumber: newSuite, equipmentId: newPrinter,
        autoIntake: newAutoIntake, autoPickup: newAutoPickup,
        notes: newNotes.trim() || undefined,
      });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Paired suite #${newSuite} → ${res.row?.printerLabel}`); setNewSuite(""); setNewPrinter(""); setNewNotes(""); refresh(); }
    });
  }

  function onRelease(r: SuitePrinterPairingRow) {
    const reason = prompt(`Release pairing for suite #${r.suiteNumber}? Reason (optional):`);
    if (reason === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await releaseSuitePrinterPairing({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`Released suite #${r.suiteNumber}`); refresh(); }
    });
  }

  function toggleAuto(r: SuitePrinterPairingRow, key: "autoIntake" | "autoPickup") {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setPairingAutoFlags({ id: r.id, [key]: !r[key] });
      if (res.error) setError(res.error);
      else { refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Printer pairings
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>🖨️ Suite ↔ printer pairings</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Claim a Bluetooth thermal printer (iter-145 Equipment) for a specific suite. When a new MailItem arrives or pickup is signed, the iter-155 thermal print route auto-fires to that suite&apos;s paired printer. Members walk in to pre-printed paper.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>+ Add pairing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={newSuite} onChange={(e) => setNewSuite(e.target.value)} placeholder="Suite # (e.g. 042)"
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <select value={newPrinter} onChange={(e) => setNewPrinter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[12.5px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}>
            <option value="">— pick a printer —</option>
            {printers?.map((p) => (<option key={p.id} value={p.id}>{p.name} · {p.serial} · {p.location}</option>))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={newAutoIntake} onChange={(e) => setNewAutoIntake(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            Auto-print on intake
          </label>
          <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={newAutoPickup} onChange={(e) => setNewAutoPickup(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            Auto-print on pickup
          </label>
        </div>
        <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes (optional)" maxLength={200}
          className="w-full mt-2 px-3 py-1.5 rounded-lg text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
        <button type="button" onClick={onPair} disabled={busy || !newSuite.trim() || !newPrinter}
          className="mt-2 text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
          {busy ? "Pairing…" : "Pair"}
        </button>
        {(printers?.length ?? 0) === 0 && (
          <p className="text-[10.5px] mt-2" style={{ color: T.warning }}>
            ⚠️ No active printers in Equipment. Add one in the Equipment panel first (category=&quot;printer&quot;).
          </p>
        )}
      </div>

      <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
        <input type="checkbox" checked={!activeOnly} onChange={(e) => setActiveOnly(!e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
        Show released pairings too
      </label>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No active pairings. Add one above.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const released = !!r.releasedAtIso;
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: released ? 0.55 : 1 }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-mono font-black" style={{ color: T.blue }}>#{r.suiteNumber}</span>
                      {r.userName && <span className="text-[12px] font-bold" style={{ color: T.ink }}>· {r.userName}</span>}
                      <span className="text-[10px]" style={{ color: T.inkFaint }}>→</span>
                      <span className="text-[12.5px] font-black" style={{ color: T.ink }}>🖨️ {r.printerLabel}</span>
                      {r.printerSerial && <span className="text-[10px] font-mono" style={{ color: T.inkFaint }}>· {r.printerSerial}</span>}
                    </div>
                    <p className="text-[10.5px] mt-1" style={{ color: T.inkFaint }}>
                      Paired {new Date(r.claimedAtIso).toLocaleDateString()} · {r.printerLocation}
                      {released && <span> · Released {new Date(r.releasedAtIso!).toLocaleDateString()}{r.releasedReason && ` · ${r.releasedReason}`}</span>}
                    </p>
                    {r.notes && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkSoft }}>📝 {r.notes}</p>}
                  </div>
                  {!released && (
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => toggleAuto(r, "autoIntake")} disabled={busy}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                          style={{
                            background: r.autoIntake ? "rgba(34,197,94,0.10)" : T.surfaceAlt,
                            color: r.autoIntake ? "#15803d" : T.inkFaint,
                            border: `1px solid ${r.autoIntake ? "rgba(34,197,94,0.30)" : T.border}`,
                          }}>
                          {r.autoIntake ? "✓ Intake" : "Off Intake"}
                        </button>
                        <button type="button" onClick={() => toggleAuto(r, "autoPickup")} disabled={busy}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                          style={{
                            background: r.autoPickup ? "rgba(34,197,94,0.10)" : T.surfaceAlt,
                            color: r.autoPickup ? "#15803d" : T.inkFaint,
                            border: `1px solid ${r.autoPickup ? "rgba(34,197,94,0.30)" : T.border}`,
                          }}>
                          {r.autoPickup ? "✓ Pickup" : "Off Pickup"}
                        </button>
                      </div>
                      <button type="button" onClick={() => onRelease(r)} disabled={busy}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                        Release
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
