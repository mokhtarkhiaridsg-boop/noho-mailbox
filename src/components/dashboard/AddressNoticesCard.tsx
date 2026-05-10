"use client";

/**
 * iter-233 — Member-side address-of-record card.
 *
 * Two modes in one card:
 *   1. Manage your "address-of-record" contact list (banks, schools,
 *      employers, subscriptions, government, insurance).
 *   2. Trigger a notice run when your address changes — sends an
 *      address-change letter to each contact via email (or queues for
 *      admin to mail postal letters).
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  listMyAddressNotificationContacts,
  upsertMyAddressNotificationContact,
  deleteMyAddressNotificationContact,
  triggerAddressChangeNotice,
  getMyAddressChangeNoticeRuns,
  type AddressNotificationContactRow,
  type AddressChangeNoticeRunRow,
  type ContactCategory,
} from "@/app/actions/addressNotifications";

const CATEGORIES: Array<{ id: ContactCategory; label: string; emoji: string }> = [
  { id: "bank",         label: "Bank",         emoji: "🏦" },
  { id: "school",       label: "School",       emoji: "🎓" },
  { id: "employer",     label: "Employer",     emoji: "💼" },
  { id: "government",   label: "Government",   emoji: "🏛" },
  { id: "subscription", label: "Subscription", emoji: "📰" },
  { id: "insurance",    label: "Insurance",    emoji: "🛡" },
  { id: "other",        label: "Other",        emoji: "📌" },
];

const CATEGORY_META = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function AddressNoticesCard() {
  const [contacts, setContacts] = useState<AddressNotificationContactRow[] | null>(null);
  const [runs, setRuns] = useState<AddressChangeNoticeRunRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"contacts" | "send" | "history">("contacts");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState({
    label: "", category: "bank" as ContactCategory,
    contactEmail: "", contactPostal: "", accountNumber: "", notes: "",
  });

  // Notice trigger fields
  const [newAddress, setNewAddress] = useState("");
  const [oldAddress, setOldAddress] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function refresh() {
    void listMyAddressNotificationContacts().then(setContacts).catch(() => setContacts([]));
    void getMyAddressChangeNoticeRuns({ limit: 5 }).then(setRuns).catch(() => setRuns([]));
  }

  useEffect(refresh, []);

  function startNew() {
    setEditingId("new");
    setDraft({ label: "", category: "bank", contactEmail: "", contactPostal: "", accountNumber: "", notes: "" });
  }
  function startEdit(c: AddressNotificationContactRow) {
    setEditingId(c.id);
    setDraft({
      label: c.label, category: c.category ?? "other",
      contactEmail: c.contactEmail ?? "", contactPostal: c.contactPostal ?? "",
      accountNumber: c.accountNumber ?? "", notes: c.notes ?? "",
    });
  }
  function saveDraft() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await upsertMyAddressNotificationContact({
        id: editingId === "new" ? undefined : editingId ?? undefined,
        label: draft.label,
        category: draft.category,
        contactEmail: draft.contactEmail.trim() || undefined,
        contactPostal: draft.contactPostal.trim() || undefined,
        accountNumber: draft.accountNumber.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      });
      if (res.error) setError(res.error);
      else { setInfo("✓ Contact saved"); setEditingId(null); refresh(); }
    });
  }
  function delContact(c: AddressNotificationContactRow) {
    if (!confirm(`Delete "${c.label}"?`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await deleteMyAddressNotificationContact({ id: c.id });
      if (res.error) setError(res.error);
      else { setInfo("✓ Deleted"); refresh(); }
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelectedIds(new Set((contacts ?? []).filter((c) => c.active && c.channel !== "none").map((c) => c.id)));
  }
  function fireNotices() {
    if (!newAddress.trim()) { setError("Enter the new address."); return; }
    if (selectedIds.size === 0) { setError("Pick at least one contact."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await triggerAddressChangeNotice({
        newAddressBody: newAddress,
        oldAddressBody: oldAddress.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        noticeMessage: noticeMessage.trim() || undefined,
        contactIds: Array.from(selectedIds),
      });
      if (res.error) setError(res.error);
      else {
        setInfo(`✓ Notice sent · ${res.run?.emailsSent ?? 0} emails delivered, ${res.run?.postalGenerated ?? 0} postal letters queued`);
        setNewAddress(""); setOldAddress(""); setEffectiveDate(""); setNoticeMessage(""); setSelectedIds(new Set());
        setTab("history");
        refresh();
      }
    });
  }

  if (!contacts) return null;

  const eligibleCount = contacts.filter((c) => c.active && c.channel !== "none").length;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: BRAND.blue }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          📬 Address-of-record
        </p>
        <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
          Tell everyone about your address change in one click
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          Curate your list of banks, schools, employers, etc. When your forwarding address changes, fire a templated notice to all of them at once. Email goes out instantly; postal letters get queued for the bureau to mail.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

      <div className="mt-3 flex gap-1.5">
        {(["contacts", "send", "history"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className="text-[11px] font-bold px-3 py-1 rounded-md"
            style={{
              background: tab === t ? BRAND.blue : "white",
              color: tab === t ? "white" : BRAND.inkSoft,
              border: `1px solid ${tab === t ? BRAND.blue : BRAND.border}`,
            }}>
            {t === "contacts" ? `Contacts (${contacts.length})` : t === "send" ? `Send notice (${eligibleCount})` : `History (${runs?.length ?? 0})`}
          </button>
        ))}
      </div>

      {tab === "contacts" && (
        <div className="mt-3 space-y-2">
          {contacts.length === 0 && editingId === null && (
            <div className="rounded-xl px-4 py-6 text-center text-[12px]" style={{ background: "#F4F5F7", color: BRAND.inkFaint, border: "1px dashed #ECEEF1" }}>
              Build your contact list — banks, employers, schools, anyone who has your address on file.
            </div>
          )}
          {contacts.map((c) => (
            editingId === c.id ? null : (
              <div key={c.id} className="flex items-start justify-between gap-2 p-2 rounded-lg" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold" style={{ color: BRAND.ink }}>
                    {c.category && CATEGORY_META[c.category] ? `${CATEGORY_META[c.category]!.emoji} ` : ""}{c.label}
                    <span className="text-[9.5px] ml-1.5 px-1.5 py-0.5 rounded" style={{ background: c.channel === "email" ? "#E0F2FE" : c.channel === "postal" ? "#FEF3C7" : "#F4F5F7", color: c.channel === "email" ? "#0c4a6e" : c.channel === "postal" ? "#92400e" : "#7A8290" }}>
                      {c.channel === "email" ? "📧 email" : c.channel === "postal" ? "✉️ postal" : "no channel"}
                    </span>
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                    {c.contactEmail || (c.contactPostal ?? "").split("\n")[0]}
                    {c.accountNumber && <span style={{ color: BRAND.inkFaint }}> · {c.accountNumber}</span>}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => startEdit(c)}
                    className="text-[10px] font-bold px-2 py-1 rounded-md"
                    style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                    Edit
                  </button>
                  <button type="button" onClick={() => delContact(c)} disabled={busy}
                    className="text-[10px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                    style={{ background: "white", color: "#b91c1c", border: "1px solid #EF444440" }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          ))}
          {editingId !== null && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: "#F4F5F7", border: "1px solid #ECEEF1" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkFaint }}>{editingId === "new" ? "+ New contact" : "Edit contact"}</p>
              <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Org label (e.g. Chase Bank)"
                className="w-full px-3 py-1.5 rounded-lg text-[12.5px]"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setDraft({ ...draft, category: c.id })}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                    style={{
                      background: draft.category === c.id ? BRAND.blue : "white",
                      color: draft.category === c.id ? "white" : BRAND.inkSoft,
                      border: `1px solid ${draft.category === c.id ? BRAND.blue : BRAND.border}`,
                    }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} placeholder="Email" type="email"
                  className="px-3 py-1.5 rounded-lg text-[12px]"
                  style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
                <input value={draft.accountNumber} onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })} placeholder="Account # (optional)"
                  className="px-3 py-1.5 rounded-lg text-[12px]"
                  style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              </div>
              <textarea value={draft.contactPostal} onChange={(e) => setDraft({ ...draft, contactPostal: e.target.value })} placeholder="Postal address (optional, used if no email)" rows={2}
                className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink, resize: "none" }} />
              <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Personal note (optional)" maxLength={500}
                className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              <div className="flex gap-1.5">
                <button type="button" onClick={saveDraft} disabled={busy || !draft.label.trim()}
                  className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                  style={{ background: BRAND.blue }}>
                  {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditingId(null)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {editingId === null && (
            <button type="button" onClick={startNew}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "white", color: BRAND.blue, border: `1px solid ${BRAND.blue}40` }}>
              + Add contact
            </button>
          )}
        </div>
      )}

      {tab === "send" && (
        <div className="mt-3 space-y-2">
          {eligibleCount === 0 ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>Add at least one contact with an email or postal address first.</p>
          ) : (
            <>
              <textarea value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="New address (multi-line, formatted as you'd write it)" rows={3}
                className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink, resize: "vertical" }} />
              <textarea value={oldAddress} onChange={(e) => setOldAddress(e.target.value)} placeholder="Old address (optional, helps recipient look up your account)" rows={2}
                className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink, resize: "vertical" }} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} placeholder="Effective date (YYYY-MM-DD, optional)" type="date"
                  className="px-3 py-1.5 rounded-lg text-[12px]"
                  style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
                <input value={noticeMessage} onChange={(e) => setNoticeMessage(e.target.value)} placeholder="Personal note (optional)" maxLength={500}
                  className="px-3 py-1.5 rounded-lg text-[12px]"
                  style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
                    Pick contacts to notify ({selectedIds.size} selected)
                  </p>
                  <button type="button" onClick={selectAll}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: "white", color: BRAND.blue, border: `1px solid ${BRAND.blue}40` }}>
                    Select all
                  </button>
                </div>
                <div className="space-y-1">
                  {contacts.filter((c) => c.active && c.channel !== "none").map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-md cursor-pointer" style={{ background: selectedIds.has(c.id) ? "#E0F2FE" : "white", border: `1px solid ${selectedIds.has(c.id) ? BRAND.blue : BRAND.border}` }}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelected(c.id)} className="w-3.5 h-3.5 accent-[#1976FF]" />
                      <span className="text-[11.5px] flex-1" style={{ color: BRAND.ink }}>
                        {c.category && CATEGORY_META[c.category] ? `${CATEGORY_META[c.category]!.emoji} ` : ""}{c.label}
                        <span className="text-[9.5px] ml-1.5" style={{ color: BRAND.inkFaint }}>· {c.channel === "email" ? "📧" : "✉️"}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" onClick={fireNotices} disabled={busy || !newAddress.trim() || selectedIds.size === 0}
                className="text-[12px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: BRAND.blue }}>
                {busy ? "Sending…" : `📬 Fire notices to ${selectedIds.size} contact${selectedIds.size === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="mt-3 space-y-2">
          {!runs || runs.length === 0 ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>No notice runs yet.</p>
          ) : (
            runs.map((r) => (
              <div key={r.id} className="rounded-lg p-2.5" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
                <p className="text-[11.5px] font-bold" style={{ color: BRAND.ink }}>
                  {new Date(r.createdAtIso).toLocaleString()} · <span style={{ color: r.status === "Completed" ? "#15803d" : BRAND.inkSoft }}>{r.status}</span>
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                  {r.contactsTotal} contacts · {r.emailsSent} emails sent · {r.postalGenerated} postal queued
                  {r.effectiveDate && ` · effective ${r.effectiveDate}`}
                </p>
                <details className="mt-1">
                  <summary className="text-[10.5px] cursor-pointer" style={{ color: BRAND.inkFaint }}>{r.items.length} items</summary>
                  <ul className="mt-1 space-y-0.5">
                    {r.items.map((it) => (
                      <li key={it.id} className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
                        {it.channel === "email" ? "📧" : "✉️"} {it.contactLabel} · <span style={{ color: it.status === "sent" || it.status === "mailed" ? "#15803d" : it.status === "failed" ? "#b91c1c" : BRAND.inkFaint }}>{it.status}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
