"use client";

/**
 * iter-192 — Member-side forwarding address book (Tier 13 #101).
 *
 * Lifts iter-129's bare {label,address} CRUD into a real address book:
 * unlimited rows (capped 30 server-side), per-row default star, per-row
 * category picker for visual triage (🏡 home / 🏢 work / 🌴 snowbird /
 * 👨‍👩‍👧 family / 📦 storage / 📍 other), recipientName override (so
 * Karim's sister-in-law gets the package addressed to her, not him),
 * free-text notes, lastUsedAt relative timestamp surfaced from the
 * iter-170 batch sweeper.
 *
 * Default-flag UX: exactly one star ⭐ at any time. First add is auto-
 * default; subsequent rows have a tappable ☆ that promotes them and
 * demotes whatever was default. Deleting the default auto-promotes the
 * most-recently-used sibling so the member always has a fallback for
 * iter-129 / iter-170 forwarding to point at.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMyForwardingAddresses,
  upsertMyForwardingAddress,
  setMyForwardingAddressDefault,
  deleteMyForwardingAddress,
  type ForwardingAddressRow,
  type AddressCategory,
} from "@/app/actions/forwardingAddressBook";

const CAT_META: Record<AddressCategory, { emoji: string; label: string }> = {
  home:     { emoji: "🏡", label: "Home" },
  work:     { emoji: "🏢", label: "Work" },
  snowbird: { emoji: "🌴", label: "Snowbird" },
  family:   { emoji: "👪", label: "Family" },
  storage:  { emoji: "📦", label: "Storage" },
  other:    { emoji: "📍", label: "Other" },
};
const ALL_CATS: AddressCategory[] = ["home", "work", "snowbird", "family", "storage", "other"];

function relTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

type FormState = {
  id?: string;
  label: string;
  address: string;
  recipientName: string;
  category: AddressCategory | "";
  notes: string;
  isDefault: boolean;
};
const EMPTY_FORM: FormState = { label: "", address: "", recipientName: "", category: "", notes: "", isDefault: false };

export default function ForwardingAddressBookCard() {
  const [rows, setRows] = useState<ForwardingAddressRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  function refresh() {
    void listMyForwardingAddresses().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function openAdd() {
    setError(null); setInfo(null);
    setForm({ ...EMPTY_FORM });
  }
  function openEdit(r: ForwardingAddressRow) {
    setError(null); setInfo(null);
    setForm({
      id: r.id,
      label: r.label,
      address: r.address,
      recipientName: r.recipientName ?? "",
      category: r.category ?? "",
      notes: r.notes ?? "",
      isDefault: r.isDefault,
    });
  }

  function onSave() {
    if (!form) return;
    setError(null); setInfo(null);
    if (form.label.trim().length < 1) { setError("Give it a nickname so you can pick it later."); return; }
    if (form.address.trim().length < 5) { setError("Add a real address (≥5 chars)."); return; }
    startTransition(async () => {
      const res = await upsertMyForwardingAddress({
        id: form.id,
        label: form.label.trim(),
        address: form.address.trim(),
        recipientName: form.recipientName.trim() || undefined,
        category: form.category || undefined,
        notes: form.notes.trim() || undefined,
        isDefault: form.isDefault,
      });
      if (res.error) { setError(res.error); return; }
      setInfo(form.id ? "✓ Address updated" : "✓ Address saved");
      setForm(null);
      refresh();
    });
  }

  function onSetDefault(r: ForwardingAddressRow) {
    if (r.isDefault) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setMyForwardingAddressDefault({ id: r.id });
      if (res.error) { setError(res.error); return; }
      setInfo(`⭐ "${r.label}" is now your default forwarding address`);
      refresh();
    });
  }

  function onDelete(r: ForwardingAddressRow) {
    if (!confirm(`Delete "${r.label}"? This can't be undone.`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await deleteMyForwardingAddress({ id: r.id });
      if (res.error) { setError(res.error); return; }
      setInfo(`Deleted "${r.label}"`);
      refresh();
    });
  }

  if (rows == null) return null;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6 L8 2 L14 6 L14 13 L2 13 Z" />
              <path d="M6 13 L6 8 L10 8 L10 13" />
            </svg>
            Forwarding Address Book
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Save every place mail might need to go — snowbird condo, kid&apos;s dorm, back office. Pick the default with one tap; recurring batches use it automatically.
          </p>
        </div>
        {!form && (
          <button onClick={openAdd} className="text-xs font-black px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: BRAND.blue }}>
            + Add address
          </button>
        )}
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      {form && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkFaint }}>
            {form.id ? "Edit address" : "Add a new address"}
          </p>

          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Nickname *</p>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={80}
              placeholder="e.g. Snowbird condo · Kid's dorm · Back office"
              className="w-full rounded-lg px-3 py-2 text-[13px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>

          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Address *</p>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={600} rows={3}
              placeholder={"Street, unit\nCity, State ZIP\nCountry (if not US)"}
              className="w-full rounded-lg px-3 py-2 text-[12.5px] resize-none" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>

          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Recipient name (optional override)</p>
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} maxLength={80}
              placeholder="e.g. Sister-in-law's name if package addressed to her"
              className="w-full rounded-lg px-3 py-2 text-[12.5px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>

          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Category (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setForm({ ...form, category: "" })}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: form.category === "" ? BRAND.blue : "white", color: form.category === "" ? "white" : BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                No tag
              </button>
              {ALL_CATS.map((c) => {
                const active = form.category === c;
                return (
                  <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: active ? BRAND.blue : "white", color: active ? "white" : BRAND.ink, border: `1px solid ${BRAND.border}` }}>
                    {CAT_META[c].emoji} {CAT_META[c].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Notes (optional)</p>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={300}
              placeholder="e.g. ring buzzer 4B · doormat says Welcome · ask for Maria"
              className="w-full rounded-lg px-3 py-2 text-[12px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-3.5 h-3.5 accent-[#337485]" />
            <span className="text-[11.5px] font-bold" style={{ color: BRAND.inkSoft }}>
              ⭐ Make this my default — recurring forwarding batches will ship here
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setForm(null); setError(null); }} disabled={busy}
              className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
              style={{ color: BRAND.inkSoft, background: "transparent" }}>
              Cancel
            </button>
            <button type="button" onClick={onSave} disabled={busy}
              className="text-xs font-black px-4 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {busy ? "Saving…" : form.id ? "Save changes" : "Save address"}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 && !form && (
        <div className="rounded-xl px-4 py-6 text-center" style={{ background: "white", border: `1px dashed ${BRAND.border}` }}>
          <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>
            No saved addresses yet. Add one to enable recurring forwarding batches.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => {
            const cat = r.category ? CAT_META[r.category] : null;
            const last = relTime(r.lastUsedAtIso);
            return (
              <li key={r.id} className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${r.isDefault ? BRAND.blue : BRAND.border}`, boxShadow: r.isDefault ? "0 2px 8px rgba(51,116,133,0.12)" : "none" }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" onClick={() => onSetDefault(r)} disabled={busy || r.isDefault}
                        className="text-[14px] leading-none disabled:cursor-default"
                        title={r.isDefault ? "Default address" : "Make default"}
                        style={{ color: r.isDefault ? "#F59E0B" : BRAND.inkFaint }}>
                        {r.isDefault ? "⭐" : "☆"}
                      </button>
                      <p className="text-[13px] font-black truncate" style={{ color: BRAND.ink }}>{r.label}</p>
                      {r.isDefault && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.10em]" style={{ background: "rgba(51,116,133,0.12)", color: BRAND.blueDeep }}>
                          Default
                        </span>
                      )}
                      {cat && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: BRAND.brownSoft, color: BRAND.inkSoft }}>
                          {cat.emoji} {cat.label}
                        </span>
                      )}
                      {last && (
                        <span className="text-[10px]" style={{ color: BRAND.inkFaint }}>· used {last}</span>
                      )}
                    </div>
                    {r.recipientName && (
                      <p className="text-[11px] mt-1" style={{ color: BRAND.inkSoft }}>
                        📛 To: <strong style={{ color: BRAND.ink }}>{r.recipientName}</strong>
                      </p>
                    )}
                    <p className="text-[11.5px] mt-1 whitespace-pre-line" style={{ color: BRAND.ink }}>{r.address}</p>
                    {r.notes && (
                      <p className="text-[10.5px] italic mt-1" style={{ color: BRAND.inkFaint }}>📝 {r.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => openEdit(r)} disabled={busy}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                      style={{ background: BRAND.bg, color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(r)} disabled={busy}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
