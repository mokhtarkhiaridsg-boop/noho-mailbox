"use client";

/**
 * iter-145 — Equipment / scanner inventory panel (Tier 9 #56).
 *
 * Lists every device: filter chips by category + status, sortable
 * table, edit/delete drawer, per-device service history with one-click
 * "Log service" form. Color-coded freshness pill mirrors the suite-
 * maintenance panel from iter-143.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listEquipment,
  listEquipmentServiceLog,
  upsertEquipment,
  deleteEquipment,
  logEquipmentService,
  deleteEquipmentService,
  type EquipmentRow,
  type EquipmentServiceLogRow,
} from "@/app/actions/equipment";
// iter-11.5 — Constants + non-async types moved to a non-"use server"
// module. Server-action files can only export async fns at runtime.
import {
  EQUIP_CATEGORIES,
  EQUIP_SERVICE_KINDS,
  type EquipCategory,
  type EquipStatus,
  type EquipServiceKind,
} from "@/lib/equipment-config";

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

const FRESHNESS_STYLE: Record<EquipmentRow["freshness"], { bg: string; fg: string; label: string }> = {
  fresh:  { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "Fresh" },
  ok:     { bg: "rgba(51,116,133,0.10)", fg: "#23596A", label: "OK" },
  stale:  { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Stale" },
  never:  { bg: "rgba(0,0,0,0.05)",   fg: T.inkFaint, label: "Never serviced" },
};

const STATUS_STYLE: Record<EquipStatus, { bg: string; fg: string; label: string }> = {
  active:        { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "Active" },
  needs_service: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Needs service" },
  retired:       { bg: "rgba(0,0,0,0.06)",   fg: T.inkFaint, label: "Retired" },
  lost:          { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", label: "Lost" },
};

type Filter = "all" | "active" | "needs_service" | "retired" | "lost" | EquipCategory;

export default function AdminEquipmentPanel() {
  const [rows, setRows] = useState<EquipmentRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<EquipmentRow | "new" | null>(null);
  const [drawerEquipId, setDrawerEquipId] = useState<string | null>(null);

  function refresh() {
    void listEquipment().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, active: 0, needs_service: 0, retired: 0, lost: 0 };
    for (const r of rows ?? []) {
      c.all = (c.all ?? 0) + 1;
      c[r.status] = (c[r.status] ?? 0) + 1;
      c[r.category] = (c[r.category] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "all") return rows;
    if (["active", "needs_service", "retired", "lost"].includes(filter)) {
      return rows.filter((r) => r.status === filter);
    }
    return rows.filter((r) => r.category === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Equipment inventory
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Equipment &amp; scanner inventory
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Track every Jaden printer, scanner, terminal, and camera. Status pills + service log keep accountability tight.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"}            label="All"            count={counts.all ?? 0}            onClick={() => setFilter("all")} tone={T.ink} />
          <FilterChip active={filter === "active"}         label="Active"         count={counts.active ?? 0}         onClick={() => setFilter("active")} tone={T.success} />
          <FilterChip active={filter === "needs_service"}  label="Needs service"  count={counts.needs_service ?? 0}  onClick={() => setFilter("needs_service")} tone={T.warning} />
          <FilterChip active={filter === "retired"}        label="Retired"        count={counts.retired ?? 0}        onClick={() => setFilter("retired")} tone={T.inkFaint} />
          <FilterChip active={filter === "lost"}           label="Lost"           count={counts.lost ?? 0}           onClick={() => setFilter("lost")} tone={T.danger} />
          <span className="w-px h-5 mx-0.5" style={{ background: T.border }} />
          {EQUIP_CATEGORIES.map((c) => (
            <FilterChip
              key={c.key}
              active={filter === c.key}
              label={`${c.emoji} ${c.label}`}
              count={counts[c.key] ?? 0}
              onClick={() => setFilter(c.key)}
              tone={T.blueDeep}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white"
          style={{ background: T.blue }}
        >
          + Add equipment
        </button>
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          {rows.length === 0 ? "No equipment tracked yet — click +Add equipment." : "No equipment matches this filter."}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: T.surfaceAlt }}>
              <tr>
                <Th>Device</Th>
                <Th>Serial</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th align="center">Last service</Th>
                <Th align="right">{""}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cat = EQUIP_CATEGORIES.find((c) => c.key === r.category);
                const fr = FRESHNESS_STYLE[r.freshness];
                const st = STATUS_STYLE[r.status];
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-[#F4F5F7]"
                    style={{ borderTop: `1px solid ${T.border}` }}
                    onClick={() => setDrawerEquipId(r.id)}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-[12.5px] font-bold" style={{ color: T.ink }}>
                        <span className="mr-1">{cat?.emoji ?? "🔧"}</span> {r.name}
                      </p>
                      <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                        {r.vendor ?? "—"}{r.model ? ` · ${r.model}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono" style={{ color: T.inkSoft }}>
                      {r.serial}
                    </td>
                    <td className="px-4 py-2.5 text-[11.5px]" style={{ color: T.inkSoft }}>
                      {r.location}
                      {r.assignedToName && (
                        <span className="block text-[10px]" style={{ color: T.inkFaint }}>
                          → {r.assignedToName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: fr.bg, color: fr.fg }}>
                        {fr.label}
                      </span>
                      <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: T.inkFaint }}>
                        {r.daysSinceLastService == null ? "—" : `${r.daysSinceLastService}d ago`}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                        className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                        style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EquipmentEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {drawerEquipId && (
        <EquipmentDrawer
          equipmentId={drawerEquipId}
          row={rows?.find((r) => r.id === drawerEquipId) ?? null}
          onClose={() => setDrawerEquipId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>
      {children}
    </th>
  );
}

function FilterChip({ active, label, count, onClick, tone }: {
  active: boolean; label: string; count: number; onClick: () => void; tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11.5px] font-bold px-2.5 py-1 rounded-full transition-colors"
      style={{
        background: active ? T.blue : "white",
        color: active ? "white" : tone,
        border: `1px solid ${active ? T.blue : T.border}`,
      }}
    >
      {label} <span className="opacity-70 tabular-nums">{count}</span>
    </button>
  );
}

function EquipmentEditor({ row, onClose, onSaved }: {
  row: EquipmentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [category, setCategory] = useState<EquipCategory>(row?.category ?? "printer");
  const [serial, setSerial] = useState(row?.serial ?? "");
  const [vendor, setVendor] = useState(row?.vendor ?? "");
  const [model, setModel] = useState(row?.model ?? "");
  const [location, setLocation] = useState(row?.location ?? "Bureau");
  const [status, setStatus] = useState<EquipStatus>(row?.status ?? "active");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [purchasedAt, setPurchasedAt] = useState(row?.purchasedAtIso ? row.purchasedAtIso.slice(0, 10) : "");
  const [purchasePriceDollars, setPurchasePriceDollars] = useState(
    row?.purchasePriceCents != null ? (row.purchasePriceCents / 100).toFixed(2) : "",
  );
  const [warrantyEndsAt, setWarrantyEndsAt] = useState(row?.warrantyEndsAtIso ? row.warrantyEndsAtIso.slice(0, 10) : "");
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSave() {
    setErrorMsg(null);
    const priceCents = purchasePriceDollars.trim()
      ? Math.round(parseFloat(purchasePriceDollars) * 100)
      : undefined;
    startTransition(async () => {
      const res = await upsertEquipment({
        id: row?.id,
        name,
        category,
        serial,
        vendor: vendor.trim() || undefined,
        model: model.trim() || undefined,
        location: location.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        purchasedAtIso: purchasedAt ? new Date(purchasedAt).toISOString() : undefined,
        purchasePriceCents: priceCents,
        warrantyEndsAtIso: warrantyEndsAt ? new Date(warrantyEndsAt).toISOString() : undefined,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  function onDelete() {
    if (!row) return;
    if (!confirm(`Delete ${row.name} (${row.serial})? Service history will also be removed.`)) return;
    startTransition(async () => {
      const res = await deleteEquipment(row.id);
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              {row ? "Edit equipment" : "New equipment"}
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {row?.name ?? "Add a device to inventory"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Front-counter Jaden" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Serial *">
              <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Printed on the device" className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Vendor">
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Jadens, Honeywell, …" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Model">
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="D300, 1900GHD…" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
          </div>

          <div>
            <Label>Category</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {EQUIP_CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: category === c.key ? T.blue : "white", color: category === c.key ? "white" : T.inkSoft, border: `1px solid ${category === c.key ? T.blue : T.border}` }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(Object.entries(STATUS_STYLE) as Array<[EquipStatus, typeof STATUS_STYLE[EquipStatus]]>).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => setStatus(key)} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: status === key ? T.blue : "white", color: status === key ? "white" : T.inkSoft, border: `1px solid ${status === key ? T.blue : T.border}` }}>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bureau, Storage, Loaner…" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Purchased">
              <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Purchase price ($)">
              <input value={purchasePriceDollars} onChange={(e) => setPurchasePriceDollars(e.target.value)} placeholder="0.00" inputMode="decimal" className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
          </div>

          <Field label="Warranty ends">
            <input type="date" value={warrantyEndsAt} onChange={(e) => setWarrantyEndsAt(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything admin should know" className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>

          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
        </div>

        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          {row ? (
            <button type="button" onClick={onDelete} disabled={pending} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
              Delete equipment
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
            <button type="button" onClick={onSave} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "Saving…" : row ? "Save changes" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipmentDrawer({ equipmentId, row, onClose, onChanged }: {
  equipmentId: string;
  row: EquipmentRow | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [logs, setLogs] = useState<EquipmentServiceLogRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<EquipServiceKind>("service");
  const [notes, setNotes] = useState("");
  const [costDollars, setCostDollars] = useState("");

  function refreshLogs() {
    void listEquipmentServiceLog({ equipmentId }).then(setLogs).catch(() => setLogs([]));
  }
  useEffect(refreshLogs, [equipmentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit() {
    setErrorMsg(null);
    const cost = costDollars.trim() ? Math.round(parseFloat(costDollars) * 100) : undefined;
    startTransition(async () => {
      const res = await logEquipmentService({ equipmentId, kind, notes: notes.trim() || undefined, costCents: cost });
      if (res.error) { setErrorMsg(res.error); return; }
      setNotes("");
      setCostDollars("");
      refreshLogs();
      onChanged();
    });
  }

  function onDeleteLog(id: string) {
    if (!confirm("Delete this service log entry? Audit trail is preserved.")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteEquipmentService(id);
      setBusyId(null);
      if (res.error) { setErrorMsg(res.error); return; }
      refreshLogs();
      onChanged();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Equipment · service log
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {row?.name ?? "Equipment"}
            </h3>
            {row && (
              <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
                {row.serial} · {row.location}{row.assignedToName ? ` → ${row.assignedToName}` : ""}
                {row.daysSinceLastService != null && ` · last serviced ${row.daysSinceLastService}d ago`}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Log a new service event
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EQUIP_SERVICE_KINDS.map((k) => (
                <button key={k.key} type="button" onClick={() => setKind(k.key)} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: kind === k.key ? T.blue : "white", color: kind === k.key ? "white" : T.inkSoft, border: `1px solid ${kind === k.key ? T.blue : T.border}` }}>
                  {k.emoji} {k.label}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done (replaced cutter blade, updated firmware…)" rows={2} maxLength={500} className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black" style={{ color: T.inkSoft }}>$</span>
                <input value={costDollars} onChange={(e) => setCostDollars(e.target.value)} placeholder="Cost" inputMode="decimal" className="w-full pl-6 pr-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
              </div>
            </div>
            {errorMsg && <p className="mt-1 text-[11px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={onSubmit} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                {pending ? "Saving…" : "Save log entry"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
              History {logs && `(${logs.length})`}
            </p>
            {logs == null ? (
              <p className="text-[11.5px]" style={{ color: T.inkFaint }}>Loading…</p>
            ) : logs.length === 0 ? (
              <div className="rounded-lg px-3 py-4 text-center text-[11.5px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
                No service entries yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {logs.map((l) => {
                  const meta = EQUIP_SERVICE_KINDS.find((k) => k.key === l.kind);
                  const at = new Date(l.performedAtIso);
                  return (
                    <li key={l.id} className="rounded-lg p-3 flex items-start justify-between gap-3" style={{ background: "white", border: `1px solid ${T.border}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10.5px] font-black" style={{ color: T.ink }}>
                            {meta?.emoji ?? "🔧"} {meta?.label ?? l.kind}
                          </span>
                          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                            · {at.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {l.performedByName && <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· by {l.performedByName}</span>}
                          {l.costCents != null && (
                            <span className="text-[10.5px] font-black" style={{ color: "#15803d" }}>
                              · ${(l.costCents / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {l.notes && <p className="text-[11.5px] mt-1 italic" style={{ color: T.inkSoft }}>{l.notes}</p>}
                      </div>
                      <button type="button" disabled={pending && busyId === l.id} onClick={() => onDeleteLog(l.id)} className="shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.20)" }}>
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
