"use client";

/**
 * iter-212 — Admin shipment-receipt panel (Tier 15 #121).
 *
 * Lists recent shipment receipts + per-row "Open" link to the public
 * receipt page + scan-count + carrier/tracking. Top "Generate for
 * recent labels" button scans last 30d of ShippoLabels and creates a
 * receipt for any that doesn't have one yet, then surfaces a link to
 * the printable QR-sticker sheet.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listShipmentReceipts,
  ensureReceiptsForRecentLabels,
  type ShipmentReceiptRow,
} from "@/app/actions/shipmentReceipt";

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

export default function AdminShipmentReceiptsPanel() {
  const [rows, setRows] = useState<ShipmentReceiptRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listShipmentReceipts({ limit: 80 }).then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function onEnsure() {
    setInfo(null); setError(null);
    startTransition(async () => {
      try {
        const res = await ensureReceiptsForRecentLabels({ sinceDays: 30 });
        setInfo(`✓ Scanned ${res.total} labels · created ${res.created} new receipts · ${res.existing} already had one`);
        refresh();
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  }

  const totalScans = rows?.reduce((s, r) => s + r.scanCount, 0) ?? 0;
  const everScanned = rows?.filter((r) => r.scanCount > 0).length ?? 0;

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
          Shipment Receipts
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
          scan-to-prove
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {rows?.length ?? 0} on file · {totalScans} scans
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: T.inkFaint }}>
          Stick a 1×1in QR sticker on every outbound package. Recipients scan it and land on a receipt page proving the package came from NOHO Mailbox — builds trust + brand recognition. No PII leaked: recipient name is blurred to "First L.".
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Receipts on file" value={rows?.length ?? 0} accent={T.blueDeep} />
        <Tile label="Total scans" value={totalScans} accent={T.success} />
        <Tile label="Ever scanned" value={everScanned} accent={T.warning} />
      </div>

      <div className="rounded-2xl p-4 flex flex-wrap gap-2 items-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <button type="button" onClick={onEnsure} disabled={busy}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
          {busy ? "Generating…" : "🔁 Auto-create for recent labels (30d)"}
        </button>
        <a href="/admin/print/shipment-receipts?ensure=1&limit=24" target="_blank" rel="noopener noreferrer"
          className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}`, textDecoration: "none" }}>
          📄 Print sticker sheet (Avery 22806) ↗
        </a>
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No receipts yet. Tap "Auto-create" above to generate one per recent ShippoLabel.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.blueDeep }}>{r.verifyToken}</span>
                    {r.carrier && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>{r.carrier}</span>}
                    <span className="text-[10px]" style={{ color: T.inkFaint }}>
                      {new Date(r.shippedAtIso).toLocaleDateString()}
                    </span>
                    {r.scanCount > 0 && (
                      <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.10em]" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>
                        ✓ scanned {r.scanCount}×
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: T.ink }}>
                    <strong>{r.senderDisplay}</strong> → <span style={{ color: T.inkSoft }}>{r.recipientDisplay}</span>
                  </p>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                    {r.shippedFrom}
                    {r.trackingNumber && <span className="font-mono"> · {r.trackingNumber}</span>}
                  </p>
                </div>
                <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white shrink-0" style={{ background: T.blue, textDecoration: "none" }}>
                  Open receipt ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}
