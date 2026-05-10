"use client";

/**
 * iter-176 — Admin dropoff-barcode scan panel (Tier 11 #85).
 *
 * Admin scans a kiosk-printed barcode → form auto-fills → admin saves.
 * Uses the existing iter-83 logScannedInbound action so the resulting
 * MailItem gets the full mail-arrived treatment (email + push +
 * member webhook).
 *
 * Right side shows pending barcodes so admin can see what's expected
 * even if a code wasn't scanned (member gave up their printed receipt
 * but read the code aloud).
 */

import { useEffect, useState, useTransition } from "react";
import {
  lookupDropoffBarcode,
  claimDropoffBarcode,
  listRecentDropoffBarcodes,
  type DropoffBarcodeRow,
} from "@/app/actions/dropoffBarcode";
import { logScannedInbound } from "@/app/actions/mail";
import { formatDropoffCode, normalizeDropoffCode } from "@/lib/dropoff-barcode";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

type Filter = "pending" | "claimed" | "expired" | "all";

export default function AdminDropoffBarcodePanel() {
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<DropoffBarcodeRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [recent, setRecent] = useState<DropoffBarcodeRow[] | null>(null);

  function refresh() {
    void listRecentDropoffBarcodes({ status: filter, limit: 30 }).then(setRecent).catch(() => setRecent([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onScan(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null); setInfo(null); setScanned(null);
    const code = normalizeDropoffCode(scanInput);
    if (code.length < 6) { setError("Type or scan a code (≥6 chars)."); return; }
    startTransition(async () => {
      const res = await lookupDropoffBarcode({ code });
      if (!res.ok) setError(res.error);
      else setScanned(res.row);
    });
  }

  function onClaim(row: DropoffBarcodeRow) {
    setError(null);
    startTransition(async () => {
      const res = await logScannedInbound({
        trackingNumber: row.expectedTracking || `DROPOFF-${row.code}`,
        carrier: row.expectedCarrier || "Other",
        suiteNumber: row.suiteNumber,
        recipientName: row.expectedSender,
        notes: row.notes ?? undefined,
      });
      if (!res.success || !res.mailItemId) {
        setError(("error" in res && typeof res.error === "string" ? res.error : null) ?? "Intake failed");
        return;
      }
      const claim = await claimDropoffBarcode({ code: row.code, mailItemId: res.mailItemId });
      if (claim.error) {
        setError(`Intake saved but claim failed: ${claim.error}`);
        refresh();
        return;
      }
      setInfo(`✓ Intake saved + barcode ${formatDropoffCode(row.code)} claimed`);
      setScanned(null);
      setScanInput("");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Dropoff Barcode
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
          beep & receive
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {recent?.length ?? 0} recent
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        Members generate barcodes at <code style={{ background: T.surfaceAlt, padding: "0 4px", borderRadius: 3 }}>nohomailbox.org/dropoff</code> before arriving with a package. Scan the receipt here → intake auto-fills → save.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        {/* Scan + form */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <form onSubmit={onScan} className="flex items-center gap-2">
            <input
              autoFocus
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scan or type code (XXXX-XXXX-XXXX)"
              className="flex-1 px-4 py-3 rounded-xl text-[15px] font-mono"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink, letterSpacing: "0.10em" }}
              autoComplete="off" spellCheck={false}
            />
            <button type="submit" disabled={pending} className="text-[12px] font-black px-4 py-3 rounded-xl text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "…" : "Scan"}
            </button>
          </form>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
          {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

          {scanned && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(25,118,255,0.06)", border: `2px solid ${T.blue}` }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.blue }}>
                  Auto-filled from {formatDropoffCode(scanned.code)}
                </p>
                <p className="text-[14px] font-black mt-1" style={{ color: T.ink }}>
                  Suite #{scanned.suiteNumber} · From: <span style={{ color: T.blueDeep }}>{scanned.expectedSender}</span>
                </p>
                {(scanned.expectedCarrier || scanned.expectedTracking) && (
                  <p className="text-[11.5px] font-mono mt-0.5" style={{ color: T.inkSoft }}>
                    {scanned.expectedCarrier ?? ""} · {scanned.expectedTracking ?? "(no tracking)"}
                  </p>
                )}
                {scanned.notes && (
                  <p className="text-[11px] italic mt-1" style={{ color: T.inkSoft }}>📝 {scanned.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={() => onClaim(scanned)} className="text-[12px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.success }}>
                  ✓ Save intake + claim
                </button>
                <button type="button" onClick={() => setScanned(null)} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
                  Cancel
                </button>
              </div>
              <p className="text-[10px]" style={{ color: T.inkFaint }}>
                Tracking saved as <code>{scanned.expectedTracking || `DROPOFF-${scanned.code}`}</code>. Carrier: {scanned.expectedCarrier || "Other"}. You can edit the resulting MailItem from the Mail tab if needed.
              </p>
            </div>
          )}

          <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
            Dashes are auto-stripped on scan. Codes expire 14 days after generation. Already-claimed codes show an error so you don't double-intake.
          </p>
        </div>

        {/* Pending list */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Recent codes</p>
          <div className="flex flex-wrap gap-1">
            {(["pending", "claimed", "expired", "all"] as Filter[]).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className="text-[10.5px] font-bold px-2 py-0.5 rounded-md" style={{
                background: filter === f ? T.blue : "white",
                color: filter === f ? "white" : T.inkSoft,
                border: `1px solid ${filter === f ? T.blue : T.border}`,
              }}>
                {f}
              </button>
            ))}
          </div>
          {recent == null ? (
            <p className="text-[11px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: T.inkFaint }}>None.</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li key={r.id} className="rounded-md p-2 cursor-pointer hover:bg-[#F4F5F7]" style={{ background: "white", border: `1px solid ${T.border}` }} onClick={() => { setScanInput(r.code); setScanned(null); setError(null); setInfo(null); }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-[11px]" style={{ color: T.blueDeep }}>{formatDropoffCode(r.code)}</span>
                    {r.claimedAtIso && <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>CLAIMED</span>}
                    {!r.claimedAtIso && new Date(r.expiresAtIso) < new Date() && <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.10)", color: "#991b1b" }}>EXPIRED</span>}
                    <span className="ml-auto text-[10px]" style={{ color: T.inkFaint }}>#{r.suiteNumber}</span>
                  </div>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: T.ink }}>{r.expectedSender}</p>
                  {(r.expectedCarrier || r.expectedTracking) && (
                    <p className="text-[10px] font-mono truncate" style={{ color: T.inkFaint }}>
                      {r.expectedCarrier ?? ""} {r.expectedTracking ?? ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
