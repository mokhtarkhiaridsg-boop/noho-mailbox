"use client";

/**
 * iter-214 — Admin alumni-network panel (Tier 15 #123).
 *
 * Lists alumni with status filter + per-row actions (mark
 * reactivated when an alumni signs back up, purge after CMRA
 * retention). Top form for converting a User → alumni manually
 * (when admin finalizes a cancellation outside the iter-117 flow)
 * and a manual-add form for ex-bureau owners / acquired members.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAdminAlumni,
  convertUserToAlumni,
  addAlumniManually,
  markAlumniReactivated,
  purgeAlumniRow,
  getAlumniSummary,
  type AlumniRow,
  type AlumniSummary,
} from "@/app/actions/alumni";

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

const STATUS_FILTERS: Array<{ id: "all" | AlumniRow["status"]; label: string }> = [
  { id: "Active", label: "Active" },
  { id: "Reactivated", label: "Reactivated" },
  { id: "Unsubscribed", label: "Unsubscribed" },
  { id: "Purged", label: "Purged" },
  { id: "all", label: "All" },
];

export default function AdminAlumniPanel() {
  const [filter, setFilter] = useState<"all" | AlumniRow["status"]>("Active");
  const [rows, setRows] = useState<AlumniRow[] | null>(null);
  const [summary, setSummary] = useState<AlumniSummary | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Convert form
  const [convertUserId, setConvertUserId] = useState("");

  // Manual-add form
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addNotes, setAddNotes] = useState("");

  function refresh() {
    void listAdminAlumni({ status: filter === "all" ? undefined : filter, limit: 200 }).then(setRows).catch(() => setRows([]));
    void getAlumniSummary().then(setSummary).catch(() => setSummary(null));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onConvert() {
    if (!convertUserId.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await convertUserToAlumni({ userId: convertUserId.trim() });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Converted ${res.row?.name} to alumni`); setConvertUserId(""); refresh(); }
    });
  }
  function onAdd() {
    if (!addEmail.trim() || !addName.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await addAlumniManually({ email: addEmail.trim(), name: addName.trim(), notes: addNotes.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Added ${res.row?.name}`); setShowAdd(false); setAddEmail(""); setAddName(""); setAddNotes(""); refresh(); }
    });
  }
  function onReactivate(r: AlumniRow) {
    const newId = prompt(`${r.name} signed back up — paste their new User ID:`);
    if (!newId?.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markAlumniReactivated({ id: r.id, newUserId: newId.trim() });
      if (res.error) setError(res.error); else { setInfo(`✓ Marked ${r.name} reactivated`); refresh(); }
    });
  }
  function onPurge(r: AlumniRow) {
    const reason = prompt(`Soft-purge ${r.name}'s alumni record? (only allowed after 5y CMRA retention) Reason:`);
    if (reason === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await purgeAlumniRow({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error); else { setInfo("Purged"); refresh(); }
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
          Alumni
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
          welcome them back
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {summary ? `${summary.active} active · ${summary.reactivated} reactivated` : "alumni network"}
        </span>
      </div>
      <p className="text-[11px]" style={{ color: T.inkFaint }}>
        When a member cancels, convert them here to keep their record archived for the CMRA-required 5y retention + send a quarterly "we miss you" newsletter (reactivation funnel).
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Tile label="Active" value={summary.active} accent={T.blueDeep} />
          <Tile label="Reactivated" value={summary.reactivated} accent={T.success} />
          <Tile label="Unsubscribed" value={summary.unsubscribed} accent={T.warning} />
          <Tile label="Reactivation %" value={`${summary.reactivationRatePct}%`} accent={summary.reactivationRatePct >= 10 ? T.success : T.inkFaint} />
          <Tile label="Newsletters sent" value={summary.newsletterSentTotal} accent={T.inkFaint} />
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>🔁 Convert a User → alumni</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={convertUserId} onChange={(e) => setConvertUserId(e.target.value)}
            placeholder="User ID (paste from Customers panel)"
            className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg text-[12px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <button type="button" onClick={onConvert} disabled={busy || !convertUserId.trim()}
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Converting…" : "Convert"}
          </button>
          <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg ml-auto" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
            {showAdd ? "✕ Cancel" : "+ Manual add"}
          </button>
        </div>
        {showAdd && (
          <div className="mt-3 space-y-1.5">
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@example.com"
              className="w-full px-3 py-1.5 rounded-lg text-[12.5px] font-mono" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Display name"
              className="w-full px-3 py-1.5 rounded-lg text-[12.5px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Notes (optional)"
              className="w-full px-3 py-1.5 rounded-lg text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <button type="button" onClick={onAdd} disabled={busy || !addEmail.trim() || !addName.trim()}
              className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {busy ? "Adding…" : "Add to alumni"}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: filter === f.id ? T.blue : "white",
              color: filter === f.id ? "white" : T.ink,
              border: `1px solid ${filter === f.id ? T.blue : T.border}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No alumni in this view.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === "Reactivated" ? "rgba(34,197,94,0.10)" : r.status === "Unsubscribed" ? "rgba(239,68,68,0.10)" : r.status === "Purged" ? "rgba(122,130,144,0.10)" : "rgba(25,118,255,0.10)",
                        color: r.status === "Reactivated" ? "#15803d" : r.status === "Unsubscribed" ? T.danger : r.status === "Purged" ? T.inkSoft : T.blueDeep,
                      }}>
                      {r.status}
                    </span>
                    <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.name}</span>
                    <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· {r.email}</span>
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>{r.source}</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                    Alumni since {new Date(r.alumniSinceIso).toLocaleDateString()} ({r.yearsArchived}y)
                    {r.planEndDate && <span> · last plan {r.planEndDate}</span>}
                    {r.newsletterSentCount > 0 && <span> · {r.newsletterSentCount} newsletter{r.newsletterSentCount === 1 ? "" : "s"} sent</span>}
                  </p>
                  {r.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: T.inkFaint }}>📝 {r.notes}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {r.status === "Active" && (
                    <button type="button" onClick={() => onReactivate(r)} disabled={busy}
                      className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                      ✓ Reactivated
                    </button>
                  )}
                  {(r.status === "Active" || r.status === "Unsubscribed") && r.yearsArchived >= 5 && (
                    <button type="button" onClick={() => onPurge(r)} disabled={busy}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                      Purge
                    </button>
                  )}
                </div>
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
