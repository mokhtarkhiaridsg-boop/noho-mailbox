"use client";

// iter-120 — Pinned-notes board.
//
// Two halves:
//   - LEFT: every note across the whole customer base flagged pinned=true.
//     Sticky-note style cards with kind chip, body, who/when, click to see
//     all notes for that customer.
//   - RIGHT: customer-detail drawer showing pinned-first timeline + create
//     new note form (kind picker + body + pin checkbox).
//
// Pin / unpin / delete each round-trip through the existing
// customerOps actions (iter-?). No schema changes.

import { useEffect, useState, useTransition } from "react";
import {
  listAllPinnedNotes,
  listUserNotesForBoard,
  findCustomersForNote,
  type PinnedNoteRow,
} from "@/app/actions/pinnedNotes";
import {
  addCustomerNote,
  togglePinNote,
  deleteCustomerNote,
} from "@/app/actions/customerOps";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

const KIND_META: Record<string, { label: string; bg: string; fg: string }> = {
  note:       { label: "Note",       bg: "rgba(245,166,35,0.18)", fg: "#92400e" },
  call:       { label: "Call",       bg: "rgba(51,116,133,0.12)", fg: "#0F5BD9" },
  visit:      { label: "Visit",      bg: "rgba(22,163,74,0.14)",  fg: "#15803d" },
  compliance: { label: "Compliance", bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" },
  billing:    { label: "Billing",    bg: "rgba(124,58,237,0.10)", fg: "#5b21b6" },
  issue:      { label: "Issue",      bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" },
  system:     { label: "System",     bg: "rgba(45,16,15,0.06)",   fg: "#3B4252" },
};

type SelectedCustomer = { id: string; name: string; email: string; suiteNumber: string | null };

export default function AdminPinnedNotesPanel() {
  const [pinned, setPinned] = useState<PinnedNoteRow[] | null>(null);
  const [picked, setPicked] = useState<SelectedCustomer | null>(null);
  const [picketNotes, setPickedNotes] = useState<PinnedNoteRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SelectedCustomer[]>([]);

  function refreshPinned() {
    void listAllPinnedNotes().then(setPinned).catch(() => setPinned([]));
  }
  function refreshPickedNotes(userId: string) {
    void listUserNotesForBoard(userId).then(setPickedNotes).catch(() => setPickedNotes([]));
  }
  useEffect(() => { refreshPinned(); }, []);

  // Debounced customer search.
  useEffect(() => {
    if (searchQ.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      void findCustomersForNote(searchQ).then(setSearchResults).catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [searchQ]);

  function pickFromPinnedRow(r: PinnedNoteRow) {
    const c: SelectedCustomer = { id: r.userId, name: r.userName, email: r.userEmail, suiteNumber: r.suiteNumber };
    setPicked(c); setPickedNotes(null); refreshPickedNotes(c.id);
  }
  function pickFromSearch(c: SelectedCustomer) {
    setPicked(c); setSearchQ(""); setSearchResults([]); setPickedNotes(null); refreshPickedNotes(c.id);
  }

  function unpinNote(noteId: string) {
    startTransition(async () => {
      await togglePinNote(noteId);
      refreshPinned();
      if (picked) refreshPickedNotes(picked.id);
    });
  }
  function pinNote(noteId: string) {
    startTransition(async () => {
      await togglePinNote(noteId);
      refreshPinned();
      if (picked) refreshPickedNotes(picked.id);
    });
  }
  function removeNote(noteId: string) {
    if (!confirm("Delete this note? This is permanent.")) return;
    startTransition(async () => {
      await deleteCustomerNote(noteId);
      refreshPinned();
      if (picked) refreshPickedNotes(picked.id);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Customers · Sticky notes
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Pinned customer notes</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          The "always-on-top" board. Anything here is what front-desk should know before talking to the customer. Click a card to see the full timeline + add new notes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-3">
        {/* ── Pinned board ── */}
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: "rgba(45,16,15,0.55)" }}>
            All pinned ({pinned?.length ?? 0})
          </p>
          {!pinned ? (
            <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : pinned.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-[28px]">📌</p>
              <p className="text-[12.5px] font-black mt-2" style={{ color: NOHO_INK }}>No pinned notes</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                Pin a note from the customer panel — they'll surface here as a heads-up board.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pinned.map((n) => {
                const meta = KIND_META[n.kind] ?? KIND_META.note;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => pickFromPinnedRow(n)}
                    className="text-left rounded-xl p-3 transition-transform hover:scale-[1.01]"
                    style={{
                      background: "#fff8df",
                      border: "1px solid rgba(245,166,35,0.40)",
                      boxShadow: "0 2px 8px rgba(245,166,35,0.18)",
                    }}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: meta.bg, color: meta.fg }}>
                        📌 {meta.label}
                      </span>
                      <span className="text-[11px] font-black truncate" style={{ color: NOHO_INK }}>
                        {n.userName}
                      </span>
                      {n.suiteNumber && (
                        <span className="text-[10px] font-mono" style={{ color: NOHO_BLUE_DEEP }}>
                          #{n.suiteNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] whitespace-pre-wrap" style={{ color: NOHO_INK, lineHeight: 1.5 }}>
                      {n.body}
                    </p>
                    <p className="text-[10px] mt-2" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {n.authorName ?? "—"} · {new Date(n.createdAtIso).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Customer detail ── */}
        <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
          {/* Customer search */}
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            {picked ? "Customer notes" : "Pick a customer"}
          </p>
          {picked ? (
            <div className="rounded-lg px-3 py-2 mb-3 flex items-center justify-between"
              style={{ background: "rgba(51,116,133,0.06)", border: "1px solid rgba(51,116,133,0.20)" }}>
              <div className="min-w-0">
                <p className="text-[13px] font-black truncate" style={{ color: NOHO_INK }}>
                  {picked.name}
                  {picked.suiteNumber && (
                    <span className="ml-1.5 text-[10px] font-mono" style={{ color: NOHO_BLUE_DEEP }}>
                      #{picked.suiteNumber}
                    </span>
                  )}
                </p>
                <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                  {picked.email}
                </p>
              </div>
              <button type="button" onClick={() => { setPicked(null); setPickedNotes(null); }}
                className="text-[10px] font-bold px-2 py-1 rounded border"
                style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
                Change
              </button>
            </div>
          ) : (
            <div className="mb-3">
              <input
                value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search by name, email, or suite #"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
              />
              {searchResults.length > 0 && (
                <ul className="mt-2 rounded-lg border divide-y" style={{ borderColor: "#e8e5e0" }}>
                  {searchResults.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => pickFromSearch(r)}
                        className="w-full text-left px-3 py-2 hover:bg-[#fafaf7]">
                        <p className="text-[12.5px] font-black" style={{ color: NOHO_INK }}>
                          {r.name} {r.suiteNumber && <span className="ml-1 text-[10px] font-mono opacity-70">#{r.suiteNumber}</span>}
                        </p>
                        <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>{r.email}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Add note form */}
          {picked && (
            <AddNoteForm
              userId={picked.id}
              pending={pending}
              onAdded={() => { refreshPinned(); refreshPickedNotes(picked.id); }}
            />
          )}

          {/* Note timeline for picked */}
          {picked && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                Timeline ({picketNotes?.length ?? 0})
              </p>
              {!picketNotes ? (
                <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
              ) : picketNotes.length === 0 ? (
                <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>No notes yet for this customer.</p>
              ) : (
                <ul className="space-y-1.5">
                  {picketNotes.map((n) => {
                    const meta = KIND_META[n.kind] ?? KIND_META.note;
                    const isPinned = pinned?.some((p) => p.id === n.id) ?? false;
                    return (
                      <li key={n.id} className="rounded-lg p-3" style={{
                        background: isPinned ? "#fff8df" : "white",
                        border: `1px solid ${isPinned ? "rgba(245,166,35,0.40)" : "#e8e5e0"}`,
                      }}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: meta.bg, color: meta.fg }}>
                            {isPinned ? "📌 " : ""}{meta.label}
                          </span>
                          <span className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                            {n.authorName ?? "—"} · {new Date(n.createdAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[12.5px] whitespace-pre-wrap" style={{ color: NOHO_INK, lineHeight: 1.5 }}>
                          {n.body}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {isPinned ? (
                            <button type="button" onClick={() => unpinNote(n.id)} disabled={pending}
                              className="px-2 py-0.5 rounded text-[10px] font-bold border disabled:opacity-50"
                              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
                              Unpin
                            </button>
                          ) : (
                            <button type="button" onClick={() => pinNote(n.id)} disabled={pending}
                              className="px-2 py-0.5 rounded text-[10px] font-bold border disabled:opacity-50"
                              style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}>
                              📌 Pin
                            </button>
                          )}
                          <button type="button" onClick={() => removeNote(n.id)} disabled={pending}
                            className="px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-50 ml-auto"
                            style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {!picked && (
            <p className="text-[11px] italic mt-2" style={{ color: "rgba(45,16,15,0.55)" }}>
              Or click any sticky on the left to jump straight to that customer.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddNoteForm({ userId, pending, onAdded }: {
  userId: string;
  pending: boolean;
  onAdded: () => void;
}) {
  const [kind, setKind] = useState<string>("note");
  const [body, setBody] = useState("");
  const [pin, setPin] = useState(true);
  const [submitting, startSubmit] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (body.trim().length < 2) { setErr("Note can't be empty"); return; }
    startSubmit(async () => {
      const res = await addCustomerNote({ userId, kind, body, pinned: pin });
      if ((res as { error?: string }).error) {
        setErr((res as { error?: string }).error ?? "Failed");
        return;
      }
      setBody("");
      onAdded();
    });
  }

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "#e8e5e0", background: "#fafaf7" }}>
      <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
        New note
      </p>
      {err && (
        <p className="rounded px-2 py-1 mb-2 text-[11px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
          {err}
        </p>
      )}
      <div className="flex flex-wrap gap-1 mb-2">
        {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: kind === k ? NOHO_BLUE : "white",
              color: kind === k ? "white" : NOHO_INK,
              border: `1px solid ${kind === k ? NOHO_BLUE : "#e8e5e0"}`,
            }}>
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
        placeholder="Write a note about this customer…"
        className="w-full rounded-md border px-3 py-2 text-[12.5px] resize-y"
        style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: NOHO_INK }}>
          <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
          📌 Pin this note (surfaces on the board)
        </label>
        <button type="button" onClick={add} disabled={submitting || pending || body.trim().length < 2}
          className="px-3 py-1.5 rounded-md text-white text-[11px] font-black disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
          {submitting ? "Saving…" : "+ Add note"}
        </button>
      </div>
    </div>
  );
}
