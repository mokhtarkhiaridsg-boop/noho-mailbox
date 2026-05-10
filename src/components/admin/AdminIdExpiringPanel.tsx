"use client";

// iter-102 — Admin: customers with IDs expiring within 90 days.
//
// Sorted by urgency. Per-row: open compliance for that user, mark renewed
// (inline modal — type + expDate), or re-send the alert email. Reuses the
// same chrome as AdminPickupAppointmentsPanel so the admin nav feels consistent.

import { useEffect, useState, useTransition } from "react";
import {
  listAdminExpiringIds,
  adminMarkIdRenewed,
  adminResendIdExpiringEmail,
  type AdminExpiryRow,
} from "@/app/actions/idExpiry";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

export default function AdminIdExpiringPanel() {
  const [rows, setRows] = useState<AdminExpiryRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [renewing, setRenewing] = useState<{ row: AdminExpiryRow } | null>(null);

  function refresh() {
    void listAdminExpiringIds().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  function resend(r: AdminExpiryRow) {
    startTransition(async () => {
      const res = await adminResendIdExpiringEmail({ userId: r.userId, document: r.document });
      if (res.error) { alert(res.error); return; }
      alert("Email queued.");
      refresh();
    });
  }

  const expired = rows?.filter((r) => r.stage === "expired").length ?? 0;
  const sevenD  = rows?.filter((r) => r.stage === "7d").length ?? 0;
  const thirtyD = rows?.filter((r) => r.stage === "30d").length ?? 0;
  const ninetyD = rows?.filter((r) => r.stage === "90d").length ?? 0;

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
          ID Expiring
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
          renew before it lapses
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {rows?.length ?? 0} due soon
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: "rgba(0,0,0,0.55)" }}>
        USPS Form 1583 requires every CMRA customer to have an unexpired ID on file. Daily cron sends graduated reminders at 90/30/7/0 day thresholds.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Expired" value={expired} accent="#991b1b" />
        <Tile label="≤ 7 days" value={sevenD} accent="#92400e" />
        <Tile label="≤ 30 days" value={thirtyD} accent="#a16207" />
        <Tile label="≤ 90 days" value={ninetyD} accent={NOHO_BLUE_DEEP} />
      </div>

      <div className="rounded-md bg-white" style={{ border: "1px solid #ECEEF1" }}>
        {!rows ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(0,0,0,0.55)" }}>Loading expirations…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(0,0,0,0.55)" }}>No customer IDs expiring within 90 days. ✓</p>
        ) : (
          <ul>
            {rows.map((r, i) => (
              <li key={`${r.userId}:${r.document}`} className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                <div className="min-w-[110px]">
                  <p className="text-[12.5px] font-black tabular-nums" style={{ color: r.stage === "expired" ? "#991b1b" : NOHO_INK }}>
                    {r.expDate}
                  </p>
                  <p className="text-[10.5px] mt-0.5">
                    <StageChip stage={r.stage} daysLeft={r.daysLeft} />
                  </p>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                    {r.name} {r.suiteNumber && (
                      <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        Suite #{r.suiteNumber}
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
                    {r.email} · {r.type ?? "ID"} ({r.document})
                    {r.lastAlertStage && r.lastAlertSentAt && (
                      <> · last reminder: {r.lastAlertStage} on {new Date(r.lastAlertSentAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setRenewing({ row: r })}
                    className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-black border"
                    style={{ background: "linear-gradient(135deg,#22C55E,#15803d)", color: "white", borderColor: "#15803d" }}>
                    Mark renewed
                  </button>
                  <button type="button" onClick={() => resend(r)} disabled={pending}
                    className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border disabled:opacity-50"
                    style={{ background: "white", color: NOHO_BLUE_DEEP, borderColor: NOHO_BLUE }}>
                    Re-send email
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {renewing && (
        <RenewModal
          row={renewing.row}
          onClose={() => setRenewing(null)}
          onSaved={() => { setRenewing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #ECEEF1" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#7A8290" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function StageChip({ stage, daysLeft }: { stage: AdminExpiryRow["stage"]; daysLeft: number }) {
  const c = stage === "expired"  ? { bg: "rgba(231,0,19,0.18)",  fg: "#991b1b", label: `Expired ${Math.abs(daysLeft)}d` }
          : stage === "7d"       ? { bg: "rgba(245,166,35,0.22)", fg: "#92400e", label: `${daysLeft}d left` }
          : stage === "30d"      ? { bg: "rgba(245,166,35,0.16)", fg: "#92400e", label: `${daysLeft}d left` }
          :                         { bg: "rgba(51,116,133,0.14)", fg: "#0F5BD9", label: `${daysLeft}d left` };
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

function RenewModal({ row, onClose, onSaved }: {
  row: AdminExpiryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newExpDate, setNewExpDate] = useState("");
  const [newType, setNewType] = useState(row.type ?? "");
  const [newNumber, setNewNumber] = useState("");
  const [newIssuer, setNewIssuer] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    if (!newExpDate) { setErr("Pick a new expiry date"); return; }
    startTransition(async () => {
      const res = await adminMarkIdRenewed({
        userId: row.userId, document: row.document, newExpDate,
        newType: newType || null, newNumber: newNumber || null, newIssuer: newIssuer || null,
      });
      if (res.error) { setErr(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-2xl bg-white max-w-md w-full p-5" style={{ border: "1px solid #e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>
          Compliance · Mark ID renewed
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>{row.name}</h3>
        <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          {row.document} ID · current expiry: <span className="font-bold tabular-nums">{row.expDate}</span>
        </p>

        {err && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {err}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>New expiry date *</label>
            <input type="date" value={newExpDate} onChange={(e) => setNewExpDate(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}>
              <option value="">— Keep current —</option>
              <option value="DL">Driver's License</option>
              <option value="Passport">Passport</option>
              <option value="State ID">State ID</option>
              <option value="Military">Military</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>Number / Ref</label>
            <input type="text" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="optional"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>Issuer</label>
            <input type="text" value={newIssuer} onChange={(e) => setNewIssuer(e.target.value)} placeholder="state / country / agency"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={save} disabled={pending}
            className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#22C55E,#15803d)" }}>
            {pending ? "Saving…" : "Save renewal"}
          </button>
          <button type="button" onClick={onClose}
            className="px-3 py-2.5 rounded-lg text-xs font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
