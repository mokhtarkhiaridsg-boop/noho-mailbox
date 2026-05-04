"use client";

// iter-100 — Shared mailbox access card.
//
// Two columns: "I share with" (people you've granted access) and
// "Shared with me" (mailboxes you can view). Invite by email +
// per-row revoke. Both sides can revoke their own grants.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { inviteSharedAccess, listMySharedAccess, revokeSharedAccess } from "@/app/actions/sharedAccess";

type Lists = Awaited<ReturnType<typeof listMySharedAccess>>;

export default function SharedMailboxCard() {
  const [lists, setLists] = useState<Lists | null>(null);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() { void listMySharedAccess().then(setLists).catch(() => setLists({ granted: [], receivedFrom: [] })); }
  useEffect(() => { refresh(); }, []);

  function invite() {
    setMsg(null);
    if (!email.trim()) { setMsg("Enter an email"); return; }
    startTransition(async () => {
      const res = await inviteSharedAccess({ sharedUserEmail: email.trim() });
      if ((res as { error?: string }).error) { setMsg((res as { error?: string }).error || "Failed"); return; }
      setMsg(`✓ Shared with ${email.trim()}`);
      setEmail("");
      refresh();
    });
  }

  function revoke(id: string, who: string) {
    if (!confirm(`Revoke access for ${who}?`)) return;
    startTransition(async () => {
      const res = await revokeSharedAccess(id);
      if ((res as { error?: string }).error) { alert((res as { error?: string }).error); return; }
      refresh();
    });
  }

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Shared mailbox access
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Let a spouse, business partner, or family member view your mailbox + receive notifications. They need to be a NOHO member already (signed up + KYC passed).
      </p>

      {msg && (
        <div className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      {/* Invite form */}
      <div className="rounded-xl border p-3 mb-4" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: BRAND.blueDeep }}>
          Invite a member by email
        </p>
        <div className="flex items-stretch gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
          />
          <button type="button" onClick={invite} disabled={pending || !email.trim()}
            className="px-3 py-2 rounded-lg text-xs font-black text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* I share with */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: BRAND.inkSoft }}>
            I share with ({lists?.granted.length ?? 0})
          </p>
          {!lists ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
          ) : lists.granted.length === 0 ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>You haven't shared your mailbox yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {lists.granted.map((g) => (
                <li key={g.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2" style={{ borderColor: BRAND.border, background: "white" }}>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{g.name ?? g.email}</p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                      {g.email} · since {new Date(g.sinceIso).toLocaleDateString()}
                    </p>
                  </div>
                  <button type="button" onClick={() => revoke(g.id, g.name ?? g.email)} disabled={pending}
                    className="px-2 py-1 rounded-lg text-[10.5px] font-bold disabled:opacity-50"
                    style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Shared with me */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: BRAND.inkSoft }}>
            Shared with me ({lists?.receivedFrom.length ?? 0})
          </p>
          {!lists ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
          ) : lists.receivedFrom.length === 0 ? (
            <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>No one's shared their mailbox with you yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {lists.receivedFrom.map((r) => (
                <li key={r.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2" style={{ borderColor: BRAND.border, background: "rgba(51,116,133,0.04)" }}>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>
                      {r.name ?? r.email}
                      {r.suiteNumber && (
                        <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: BRAND.blueDeep }}>
                          Suite #{r.suiteNumber}
                        </span>
                      )}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                      since {new Date(r.sinceIso).toLocaleDateString()}
                    </p>
                  </div>
                  <button type="button" onClick={() => revoke(r.id, r.name ?? r.email)} disabled={pending}
                    className="px-2 py-1 rounded-lg text-[10.5px] font-bold disabled:opacity-50"
                    style={{ color: "rgba(45,16,15,0.55)", background: "rgba(45,16,15,0.04)" }}>
                    Leave
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
