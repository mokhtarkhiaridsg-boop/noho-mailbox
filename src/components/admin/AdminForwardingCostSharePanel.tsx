"use client";

/**
 * iter-230 — Forwarding cost-share split admin panel (Tier 17 #139).
 *
 * Build a Suggested group: pick ≥2 members forwarding to the same
 * destination + log each member's solo-postage estimate + the combined
 * shipment cost. Hit Approve → savings get split 50/50 (or N-way) into
 * each member's wallet via WalletTransaction kind="Refund". Optional
 * "Mark shipped" + tracking # once dropped at the carrier.
 */

import { useEffect, useState, useTransition } from "react";
import {
  createForwardingCostShareGroup,
  approveForwardingCostShareGroup,
  markCostShareGroupShipped,
  cancelForwardingCostShareGroup,
  listForwardingCostShareGroups,
  getCostShareSummary,
  searchUsersForCostShare,
  type CostShareGroupRow,
} from "@/app/actions/forwardingCostShare";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

type DraftMember = { userId: string; name: string; suite: string | null; individual: string };

function dollars(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function dollarsToCents(v: string): number {
  const n = Number.parseFloat(v.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export default function AdminForwardingCostSharePanel() {
  const [rows, setRows] = useState<CostShareGroupRow[] | null>(null);
  const [summary, setSummary] = useState<{ suggestedCount: number; approvedCount: number; shippedCount: number; totalSavingsCentsAllTime: number; totalCreditsCentsAllTime: number } | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build form
  const [destAddress, setDestAddress] = useState("");
  const [carrier, setCarrier] = useState("USPS");
  const [combined, setCombined] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<DraftMember[]>([]);

  // Member search
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; suiteNumber: string | null }>>([]);

  function refresh() {
    void listForwardingCostShareGroups({ limit: 30 }).then(setRows).catch(() => setRows([]));
    void getCostShareSummary().then(setSummary).catch(() => setSummary(null));
  }

  useEffect(refresh, []);

  // Live search
  useEffect(() => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      void searchUsersForCostShare({ q, limit: 8 }).then(setSearchResults).catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function addMember(u: { id: string; name: string | null; suiteNumber: string | null }) {
    if (draft.some((d) => d.userId === u.id)) return;
    setDraft((d) => [...d, { userId: u.id, name: u.name ?? "(no name)", suite: u.suiteNumber, individual: "" }]);
    setQ(""); setSearchResults([]);
  }

  function updateDraftIndividual(userId: string, value: string) {
    setDraft((d) => d.map((m) => m.userId === userId ? { ...m, individual: value } : m));
  }

  function removeDraft(userId: string) {
    setDraft((d) => d.filter((m) => m.userId !== userId));
  }

  // Live preview
  const totalIndividualCents = draft.reduce((acc, m) => acc + (Number.isFinite(dollarsToCents(m.individual)) ? dollarsToCents(m.individual) : 0), 0);
  const combinedCents = Number.isFinite(dollarsToCents(combined)) ? dollarsToCents(combined) : 0;
  const previewSavings = Math.max(0, totalIndividualCents - combinedCents);
  const previewPerMember = draft.length > 0 ? Math.floor(previewSavings / draft.length) : 0;

  function onCreate() {
    if (draft.length < 2) { setError("Add at least 2 members."); return; }
    if (!destAddress.trim()) { setError("Destination address required."); return; }
    const cents = dollarsToCents(combined);
    if (!Number.isFinite(cents) || cents < 0) { setError("Combined cost must be a number ≥ 0."); return; }
    const members = draft.map((m) => ({ userId: m.userId, individualPostageCents: dollarsToCents(m.individual) }));
    if (members.some((m) => !Number.isFinite(m.individualPostageCents) || m.individualPostageCents < 0)) {
      setError("Each member needs a valid individual postage estimate."); return;
    }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await createForwardingCostShareGroup({
        destAddress, carrier, combinedPostageCents: cents,
        notes: notes.trim() || undefined,
        members,
      });
      if (res.error) setError(res.error);
      else {
        setInfo(`✓ Group built · saves ${dollars(res.group?.perMemberCreditCents)} per member`);
        setDestAddress(""); setCombined(""); setNotes(""); setDraft([]);
        refresh();
      }
    });
  }

  function onApprove(g: CostShareGroupRow) {
    if (!confirm(`Approve cost-share for ${g.members.length} members? This will credit ${dollars(g.perMemberCreditCents)} to each wallet (irreversible).`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await approveForwardingCostShareGroup({ id: g.id });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Split applied · ${dollars(res.group?.perMemberCreditCents)} × ${res.group?.members.length} = ${dollars((res.group?.perMemberCreditCents ?? 0) * (res.group?.members.length ?? 0))} credited`); refresh(); }
    });
  }

  function onShip(g: CostShareGroupRow) {
    const tracking = prompt(`Tracking number for the combined shipment to ${g.destShort} (optional):`);
    if (tracking === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markCostShareGroupShipped({ id: g.id, trackingNumber: tracking.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Marked shipped`); refresh(); }
    });
  }

  function onCancel(g: CostShareGroupRow) {
    const reason = prompt(`Cancel suggested cost-share to ${g.destShort}? Reason (≥4 chars):`);
    if (!reason || reason.trim().length < 4) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await cancelForwardingCostShareGroup({ id: g.id, reason });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Cancelled`); refresh(); }
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
          Forwarding Cost-Share
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
          better together
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {rows?.length ?? 0} groups
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        When ≥2 members are forwarding to the same destination, batch their packages into one combined shipment. The postage savings split evenly back to each member's wallet (audited via WalletTransaction kind=&quot;Refund&quot;).
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Suggested" value={summary ? String(summary.suggestedCount) : "—"} accent={summary && summary.suggestedCount > 0 ? T.amber : T.inkFaint} />
        <Tile label="Approved" value={summary ? String(summary.approvedCount) : "—"} accent={summary && summary.approvedCount > 0 ? T.green : T.inkFaint} />
        <Tile label="Shipped" value={summary ? String(summary.shippedCount) : "—"} accent={T.blue} />
        <Tile label="Total saved" value={summary ? dollars(summary.totalSavingsCentsAllTime) : "—"} accent={T.green} />
      </div>

      {/* Build form */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>+ Build new cost-share group</p>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.inkSoft }}>Destination address</label>
          <textarea value={destAddress} onChange={(e) => setDestAddress(e.target.value)} placeholder="123 Main St, Apt 4B, New York NY 10128" rows={2}
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink, resize: "none" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[12.5px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}>
            {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <input value={combined} onChange={(e) => setCombined(e.target.value)} placeholder="Combined postage ($)"
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-mono"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" maxLength={200}
            className="px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
        </div>

        {/* Member picker */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: T.inkSoft }}>Add members ({draft.length} added)</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / email / suite #…"
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          {searchResults.length > 0 && (
            <ul className="mt-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              {searchResults.filter((u) => !draft.some((d) => d.userId === u.id)).map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => addMember(u)}
                    className="w-full text-left px-3 py-1.5 text-[11.5px] hover:bg-blue-50"
                    style={{ background: T.surface, color: T.ink, borderBottom: `1px solid ${T.border}` }}>
                    {u.name ?? "(no name)"}{u.suiteNumber && <span className="text-[10px] ml-1.5" style={{ color: T.inkFaint }}>· #{u.suiteNumber}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {draft.length > 0 && (
            <ul className="mt-2 space-y-1">
              {draft.map((m) => (
                <li key={m.userId} className="flex items-center gap-2 p-2 rounded-md" style={{ background: T.surfaceAlt }}>
                  <span className="text-[12px] font-bold flex-1 truncate" style={{ color: T.ink }}>
                    {m.name}{m.suite && <span className="text-[10px] ml-1.5" style={{ color: T.inkFaint }}>· #{m.suite}</span>}
                  </span>
                  <input value={m.individual} onChange={(e) => updateDraftIndividual(m.userId, e.target.value)} placeholder="Solo postage ($)"
                    className="w-32 px-2 py-1 rounded-md text-[11.5px] font-mono"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
                  <button type="button" onClick={() => removeDraft(m.userId)}
                    className="text-[10px] font-bold px-1.5 py-1 rounded-md"
                    style={{ background: T.surface, color: T.red, border: `1px solid ${T.red}40` }}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Live preview */}
        {draft.length >= 2 && combined && (
          <div className="rounded-xl p-3" style={{ background: previewSavings > 0 ? `${T.green}10` : `${T.amber}10`, border: `1px solid ${previewSavings > 0 ? `${T.green}40` : `${T.amber}40`}` }}>
            <p className="text-[10.5px] font-bold mb-1" style={{ color: T.inkSoft }}>Preview</p>
            <p className="text-[11.5px] font-mono" style={{ color: T.ink }}>
              Total individual {dollars(totalIndividualCents)} − combined {dollars(combinedCents)} = <span className="font-black" style={{ color: previewSavings > 0 ? T.green : T.amber }}>{dollars(previewSavings)} saved</span>
            </p>
            <p className="text-[12px] font-mono font-black mt-1" style={{ color: previewSavings > 0 ? T.green : T.amber }}>
              {previewSavings > 0 ? `→ ${dollars(previewPerMember)} credit per member` : "No savings — combined cost must be less than total individual"}
            </p>
          </div>
        )}

        <button type="button" onClick={onCreate}
          disabled={busy || draft.length < 2 || !combined.trim() || !destAddress.trim() || previewSavings <= 0}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: T.blue }}>
          {busy ? "Building…" : "Build group"}
        </button>
      </div>

      {/* History */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Recent groups</p>
        {!rows ? (
          <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
            No cost-share groups yet. Build one above when you spot ≥2 forwards heading to the same place.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((g) => (
              <li key={g.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${g.status === "Suggested" ? `${T.amber}55` : T.border}` }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-black" style={{ color: T.ink }}>📍 {g.destShort}</span>
                      <StatusPill status={g.status} />
                      {g.carrier && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>{g.carrier}</span>}
                      {g.trackingNumber && <span className="text-[10px] font-mono" style={{ color: T.inkFaint }}>· {g.trackingNumber}</span>}
                    </div>
                    <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                      {g.destAddressLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] font-mono" style={{ color: T.inkSoft }}>
                      <span>Individual Σ {dollars(g.totalIndividualCents)}</span>
                      <span>Combined {dollars(g.combinedPostageCents)}</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>Saved {dollars(g.savingsCents)}</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>= {dollars(g.perMemberCreditCents)} × {g.members.length}</span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {g.members.map((m) => (
                        <li key={m.id} className="text-[11px]" style={{ color: T.inkSoft }}>
                          <span className="font-bold" style={{ color: T.ink }}>{m.userName ?? "(no name)"}</span>
                          {m.suiteNumber && <span className="text-[10px] ml-1" style={{ color: T.inkFaint }}>· #{m.suiteNumber}</span>}
                          <span className="text-[10px] ml-2 font-mono" style={{ color: T.inkFaint }}>solo {dollars(m.individualPostageCents)}</span>
                          {m.creditCents > 0 && <span className="text-[10px] ml-2 font-mono font-black" style={{ color: T.green }}>· +{dollars(m.creditCents)} credited</span>}
                        </li>
                      ))}
                    </ul>
                    {g.notes && <p className="text-[10px] italic mt-1" style={{ color: T.inkSoft }}>📝 {g.notes}</p>}
                    {g.cancelledReason && <p className="text-[10px] italic mt-1" style={{ color: T.red }}>✕ Cancelled: {g.cancelledReason}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {g.status === "Suggested" && (
                      <>
                        <button type="button" onClick={() => onApprove(g)} disabled={busy}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                          style={{ background: T.green, color: "white" }}>
                          Approve & split
                        </button>
                        <button type="button" onClick={() => onCancel(g)} disabled={busy}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                          style={{ background: T.surface, color: T.red, border: `1px solid ${T.red}40` }}>
                          Cancel
                        </button>
                      </>
                    )}
                    {g.status === "Approved" && (
                      <button type="button" onClick={() => onShip(g)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.blue, color: "white" }}>
                        Mark shipped
                      </button>
                    )}
                    {g.status === "Shipped" && g.shippedAtIso && (
                      <span className="text-[10px]" style={{ color: T.inkFaint }}>
                        Shipped {new Date(g.shippedAtIso).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="font-mono font-black tabular-nums text-[18px] mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "Suggested" | "Approved" | "Shipped" | "Cancelled" }) {
  const meta: Record<string, { bg: string; fg: string; label: string }> = {
    Suggested: { bg: `${T.amber}1A`, fg: "#b45309", label: "💡 Suggested" },
    Approved:  { bg: `${T.green}1A`, fg: "#15803d", label: "✓ Approved" },
    Shipped:   { bg: `${T.blue}1A`, fg: "#1d4ed8", label: "📦 Shipped" },
    Cancelled: { bg: T.surfaceAlt, fg: T.inkFaint, label: "✕ Cancelled" },
  };
  const m = meta[status] ?? meta.Suggested!;
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: m.bg, color: m.fg, border: `1px solid ${m.fg}30` }}>
      {m.label}
    </span>
  );
}
