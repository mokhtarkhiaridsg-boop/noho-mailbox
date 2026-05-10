"use client";

/**
 * iter-193 — Mailbox color-tag system admin panel (Tier 13 #102).
 *
 * Two-pane layout: tag library on the left (CRUD) and assignment
 * surface on the right (assign by suite # OR email + per-tag member
 * list). Inline preset chips so admin can seed the library in one
 * click instead of typing names + picking colors from scratch.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listMailboxTags,
  createMailboxTag,
  updateMailboxTag,
  deleteMailboxTag,
  assignMailboxTag,
  unassignMailboxTag,
  listMembersByTag,
  type MailboxTagRow,
  type MailboxTagAssignmentRow,
} from "@/app/actions/mailboxTags";
import { TAG_COLOR_PALETTE, TAG_PRESETS, tagChipStyle } from "@/lib/mailbox-tags";

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

export default function AdminMailboxTagsPanel() {
  const [tags, setTags] = useState<MailboxTagRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Create form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLOR_PALETTE[3] as string);
  const [newDesc, setNewDesc] = useState("");

  // Selected tag for the assignment pane
  const [selected, setSelected] = useState<MailboxTagRow | null>(null);
  const [members, setMembers] = useState<MailboxTagAssignmentRow[] | null>(null);
  const [assignTarget, setAssignTarget] = useState("");
  const [assignNote, setAssignNote] = useState("");

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(TAG_COLOR_PALETTE[0] as string);
  const [editDesc, setEditDesc] = useState("");

  function refresh() {
    void listMailboxTags().then(setTags).catch(() => setTags([]));
  }
  useEffect(refresh, []);

  function loadMembers(t: MailboxTagRow) {
    setSelected(t);
    setMembers(null);
    void listMembersByTag({ tagId: t.id }).then(setMembers).catch(() => setMembers([]));
  }

  function onCreate() {
    setError(null); setInfo(null);
    if (!newName.trim()) { setError("Name required."); return; }
    startTransition(async () => {
      const res = await createMailboxTag({ name: newName, color: newColor, description: newDesc.trim() || undefined });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Created "${newName.trim()}"`);
      setCreating(false); setNewName(""); setNewDesc("");
      refresh();
    });
  }

  function applyPreset(p: typeof TAG_PRESETS[number]) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await createMailboxTag({ name: p.name, color: p.color, description: p.description });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Created preset "${p.name}"`);
      refresh();
    });
  }

  function onSaveEdit(t: MailboxTagRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await updateMailboxTag({ id: t.id, name: editName, color: editColor, description: editDesc });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Updated "${editName}"`);
      setEditId(null);
      refresh();
      if (selected?.id === t.id) loadMembers({ ...t, name: editName, color: editColor });
    });
  }

  function onDelete(t: MailboxTagRow) {
    if (!confirm(`Delete tag "${t.name}"? This will remove it from ${t.assignmentCount} member${t.assignmentCount === 1 ? "" : "s"}.`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await deleteMailboxTag({ id: t.id });
      if (res.error) { setError(res.error); return; }
      setInfo(`Deleted "${t.name}"`);
      if (selected?.id === t.id) { setSelected(null); setMembers(null); }
      refresh();
    });
  }

  function onAssign() {
    if (!selected) return;
    if (!assignTarget.trim()) { setError("Enter a suite # or email."); return; }
    setError(null); setInfo(null);
    const target = assignTarget.trim();
    const isEmail = target.includes("@");
    startTransition(async () => {
      const res = await assignMailboxTag({
        tagId: selected.id,
        suiteNumber: isEmail ? undefined : target,
        email: isEmail ? target : undefined,
        note: assignNote.trim() || undefined,
      });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ "${selected.name}" assigned to ${target}`);
      setAssignTarget(""); setAssignNote("");
      loadMembers(selected);
      refresh();
    });
  }

  function onUnassign(a: MailboxTagAssignmentRow) {
    if (!confirm(`Remove "${a.tagName}" from ${a.userName}?`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await unassignMailboxTag({ assignmentId: a.id });
      if (res.error) { setError(res.error); return; }
      setInfo(`Removed "${a.tagName}" from ${a.userName}`);
      if (selected) loadMembers(selected);
      refresh();
    });
  }

  const presetsToShow = TAG_PRESETS.filter((p) => !tags?.some((t) => t.name.toLowerCase() === p.name.toLowerCase()));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Mailbox tags
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Mailbox color-tag system</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Assign colored tags to suites for fast visual triage in the occupancy map. VIP, Compliance flag, Translator-needed, Snowbird-Q4 — define your own or seed from presets.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
        {/* Library */}
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Tag library ({tags?.length ?? "—"})
            </p>
            <button type="button" onClick={() => setCreating(!creating)} className="text-[10.5px] font-bold px-2 py-0.5 rounded-md" style={{ background: T.blue, color: "white" }}>
              {creating ? "Cancel" : "+ New tag"}
            </button>
          </div>

          {creating && (
            <div className="rounded-xl p-3 mb-3 space-y-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60}
                placeholder="Name (e.g. Snowbird Q4)"
                className="w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
              <div className="flex flex-wrap gap-1.5">
                {TAG_COLOR_PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setNewColor(c)} title={c}
                    className="w-6 h-6 rounded-md"
                    style={{ background: c, border: c === newColor ? `2px solid ${T.ink}` : `2px solid transparent` }} />
                ))}
              </div>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={200}
                placeholder="Description (optional, ≤200 chars)"
                className="w-full px-3 py-2 rounded-lg text-[12px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
              <div className="flex justify-end">
                <button type="button" onClick={onCreate} disabled={busy} className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                  {busy ? "Saving…" : "Create tag"}
                </button>
              </div>
            </div>
          )}

          {tags == null ? (
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : tags.length === 0 ? (
            <p className="text-[12px] italic text-center py-4" style={{ color: T.inkFaint }}>
              No tags defined yet. Create one above or seed from presets below.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tags.map((t) => {
                const isEditing = editId === t.id;
                const isSelected = selected?.id === t.id;
                return (
                  <li key={t.id} className="rounded-xl p-2.5"
                    style={{ background: isSelected ? "rgba(25,118,255,0.06)" : "white", border: `1px solid ${isSelected ? T.blue : T.border}` }}>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60}
                          className="w-full px-2 py-1 rounded text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
                        <div className="flex flex-wrap gap-1">
                          {TAG_COLOR_PALETTE.map((c) => (
                            <button key={c} type="button" onClick={() => setEditColor(c)} title={c}
                              className="w-5 h-5 rounded"
                              style={{ background: c, border: c === editColor ? `2px solid ${T.ink}` : `2px solid transparent` }} />
                          ))}
                        </div>
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={200}
                          placeholder="Description"
                          className="w-full px-2 py-1 rounded text-[11px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditId(null)} className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "transparent", color: T.inkSoft }}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => onSaveEdit(t)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded text-white disabled:opacity-50" style={{ background: T.blue }}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0" style={tagChipStyle(t.color)}>
                          {t.name}
                        </span>
                        <div className="flex-1 min-w-0">
                          {t.description && <p className="text-[10.5px]" style={{ color: T.inkFaint }}>{t.description}</p>}
                          <p className="text-[9.5px] mt-0.5" style={{ color: T.inkFaint }}>
                            {t.assignmentCount} assignment{t.assignmentCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button type="button" onClick={() => loadMembers(t)} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                            Assign ↗
                          </button>
                          <button type="button" onClick={() => { setEditId(t.id); setEditName(t.name); setEditColor(t.color); setEditDesc(t.description ?? ""); }} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                            Edit
                          </button>
                          <button type="button" onClick={() => onDelete(t)} disabled={busy} className="text-[9px] font-bold px-1.5 py-0.5 rounded disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {presetsToShow.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px dashed ${T.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
                Quick presets
              </p>
              <div className="flex flex-wrap gap-1">
                {presetsToShow.map((p) => (
                  <button key={p.name} type="button" onClick={() => applyPreset(p)} disabled={busy}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded disabled:opacity-50"
                    style={tagChipStyle(p.color)}
                    title={p.description}>
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignment pane */}
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Assign tag</p>
          {!selected ? (
            <p className="text-[11px] italic" style={{ color: T.inkFaint }}>Click "Assign ↗" on a tag to assign it to a member.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black px-2 py-0.5 rounded" style={tagChipStyle(selected.color)}>
                  {selected.name}
                </span>
                <span className="text-[10.5px]" style={{ color: T.inkFaint }}>{selected.assignmentCount} active</span>
              </div>
              {selected.description && <p className="text-[10.5px] mb-2" style={{ color: T.inkSoft }}>{selected.description}</p>}

              <div className="space-y-1.5 mb-3">
                <input value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}
                  placeholder="Suite # or email"
                  className="w-full px-3 py-2 rounded-lg text-[12.5px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
                <input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} maxLength={200}
                  placeholder="Note (optional, e.g. 'flagged 2026-04-15')"
                  className="w-full px-3 py-2 rounded-lg text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
                <button type="button" onClick={onAssign} disabled={busy || !assignTarget.trim()}
                  className="w-full text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                  {busy ? "Assigning…" : "Apply tag"}
                </button>
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: T.inkFaint }}>Members with this tag</p>
              {members == null ? (
                <p className="text-[11px]" style={{ color: T.inkFaint }}>Loading…</p>
              ) : members.length === 0 ? (
                <p className="text-[11px] italic" style={{ color: T.inkFaint }}>No members tagged yet.</p>
              ) : (
                <ul className="space-y-1">
                  {members.map((m) => (
                    <li key={m.id} className="rounded p-1.5 flex items-start gap-2 text-[11px]" style={{ background: T.surfaceAlt }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ color: T.ink }}>
                          {m.userName} {m.suiteNumber && <span className="font-mono" style={{ color: T.blueDeep }}>· #{m.suiteNumber}</span>}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: T.inkFaint }}>{m.userEmail}</p>
                        {m.note && <p className="italic text-[10px] mt-0.5" style={{ color: T.inkSoft }}>“{m.note}”</p>}
                      </div>
                      <button type="button" onClick={() => onUnassign(m)} disabled={busy}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
