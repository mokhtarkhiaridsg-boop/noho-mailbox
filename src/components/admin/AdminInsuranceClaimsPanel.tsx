"use client";

/**
 * iter-196 — Carrier insurance claim assistant admin panel (Tier 13 #105).
 *
 * Two modes in one panel:
 *   - List of existing claims, filterable by status, with per-row
 *     status transitions (mark filed/paid/denied/closed)
 *   - "Start new claim" wizard: paste mail item ID or tracking #,
 *     pick carrier + claim type, see live prefill (decided value,
 *     evidence list, photos thumb strip), then save Draft.
 *
 * The Open ↗ button on each row opens a modal with the full
 * pre-fill — this is the actual product. Admin scrolls through, hits
 * "Open USPS portal ↗" in a new tab, and copy-pastes one section at
 * a time. Cuts the 30-min "find evidence + fill form" job to 2 min.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listInsuranceClaims,
  startInsuranceClaim,
  prefillClaimForMailItem,
  getInsuranceClaim,
  lookupMailItemForClaim,
  markClaimFiled,
  markClaimPaid,
  markClaimDenied,
  closeClaim,
  type InsuranceClaimRow,
} from "@/app/actions/insuranceClaim";
import {
  CARRIER_PORTAL_URLS,
  CLAIM_CARRIERS,
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  CLAIM_TYPES,
  type ClaimCarrier,
  type ClaimEvidence,
  type ClaimPrefill,
  type ClaimStatus,
  type ClaimType,
} from "@/lib/insurance-claim";

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

const STATUS_FILTERS: Array<{ id: "all" | ClaimStatus; label: string }> = [
  { id: "all",    label: "All" },
  { id: "Draft",  label: "Draft" },
  { id: "Filed",  label: "Filed" },
  { id: "Paid",   label: "Paid" },
  { id: "Denied", label: "Denied" },
  { id: "Closed", label: "Closed" },
];

function fmt$(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminInsuranceClaimsPanel() {
  const [rows, setRows] = useState<InsuranceClaimRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | ClaimStatus>("all");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Start-claim wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [resolvedItem, setResolvedItem] = useState<Awaited<ReturnType<typeof lookupMailItemForClaim>> | null>(null);
  const [carrier, setCarrier] = useState<ClaimCarrier>("USPS");
  const [claimType, setClaimType] = useState<ClaimType>("damaged");
  const [livePrefill, setLivePrefill] = useState<ClaimPrefill | null>(null);
  const [wizardNotes, setWizardNotes] = useState("");

  // Detail modal
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ row: InsuranceClaimRow; prefill: ClaimPrefill; evidence: ClaimEvidence } | null>(null);

  function refresh() {
    void listInsuranceClaims({ status: filter === "all" ? undefined : filter, limit: 100 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onLookup() {
    setError(null); setInfo(null);
    if (!lookupQuery.trim()) return;
    startTransition(async () => {
      const r = await lookupMailItemForClaim({ idOrTracking: lookupQuery.trim() });
      if (!r) {
        setError("No mail item with that ID or tracking #.");
        setResolvedItem(null);
        setLivePrefill(null);
        return;
      }
      setResolvedItem(r);
      // Pre-pick carrier from the item if it has one
      if (r.carrier === "USPS" || r.carrier === "UPS" || r.carrier === "FedEx" || r.carrier === "DHL" || r.carrier === "Amazon") {
        setCarrier(r.carrier);
      }
      const p = await prefillClaimForMailItem({ mailItemId: r.id, carrier, claimType });
      if (p.prefill) setLivePrefill(p.prefill);
    });
  }

  // Re-build live prefill whenever carrier or claim type changes
  useEffect(() => {
    if (!resolvedItem) return;
    void prefillClaimForMailItem({ mailItemId: resolvedItem.id, carrier, claimType }).then((r) => {
      if (r.prefill) setLivePrefill(r.prefill);
    });
  }, [resolvedItem, carrier, claimType]);

  function onStartClaim() {
    if (!resolvedItem) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await startInsuranceClaim({
        mailItemId: resolvedItem.id,
        carrier,
        claimType,
        notes: wizardNotes.trim() || undefined,
      });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Claim drafted. Click Open to view the prefill.`);
      setWizardOpen(false);
      setLookupQuery(""); setResolvedItem(null); setLivePrefill(null); setWizardNotes("");
      refresh();
      if (res.id) setOpenClaimId(res.id);
    });
  }

  function openDetail(id: string) {
    setOpenClaimId(id);
    setDetail(null);
    void getInsuranceClaim({ id }).then(setDetail).catch(() => setDetail(null));
  }
  function closeDetail() { setOpenClaimId(null); setDetail(null); }

  function onMarkFiled(claimId: string) {
    const num = prompt("Enter the carrier's claim # returned by the portal:");
    if (!num?.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markClaimFiled({ id: claimId, carrierClaimNumber: num.trim() });
      if (res.error) setError(res.error); else { setInfo("✓ Marked filed"); refresh(); if (openClaimId === claimId) openDetail(claimId); }
    });
  }
  function onMarkPaid(claimId: string) {
    const amt = prompt("Paid amount in dollars (e.g. 125.00):");
    if (!amt) return;
    const cents = Math.round(parseFloat(amt) * 100);
    if (!Number.isFinite(cents) || cents < 0) { setError("Amount must be a positive number."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markClaimPaid({ id: claimId, paidAmountCents: cents });
      if (res.error) setError(res.error); else { setInfo("✓ Marked paid"); refresh(); if (openClaimId === claimId) openDetail(claimId); }
    });
  }
  function onMarkDenied(claimId: string) {
    const reason = prompt("Why was the claim denied? (carrier's reason):");
    if (!reason?.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await markClaimDenied({ id: claimId, denialReason: reason.trim() });
      if (res.error) setError(res.error); else { setInfo("Marked denied"); refresh(); if (openClaimId === claimId) openDetail(claimId); }
    });
  }
  function onClose(claimId: string) {
    if (!confirm("Close this claim?")) return;
    startTransition(async () => {
      const res = await closeClaim({ id: claimId });
      if (res.error) setError(res.error); else { setInfo("Closed"); refresh(); if (openClaimId === claimId) openDetail(claimId); }
    });
  }

  const totals = (() => {
    if (!rows) return { total: 0, claimed: 0, paid: 0 };
    return {
      total: rows.length,
      claimed: rows.reduce((s, r) => s + r.claimedAmountCents, 0),
      paid: rows.filter((r) => r.status === "Paid").reduce((s, r) => s + (r.paidAmountCents ?? 0), 0),
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
            Operations · Insurance claims
          </p>
          <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Carrier insurance claim assistant</h2>
          <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
            Pre-fills USPS / UPS / FedEx / DHL / Amazon claim forms with declared value + intake photos + storage timeline. Cuts the 30-min evidence-gathering job to 2 min.
          </p>
        </div>
        <button type="button" onClick={() => setWizardOpen(!wizardOpen)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          {wizardOpen ? "✕ Close" : "+ Start claim"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Total claims" value={totals.total} accent={T.blueDeep} />
        <Tile label="Claimed value" value={fmt$(totals.claimed)} accent={T.warning} />
        <Tile label="Paid out" value={fmt$(totals.paid)} accent={T.success} />
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {wizardOpen && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: T.surface, border: `2px solid ${T.blue}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.blueDeep }}>
            🔍 Look up the mail item
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input value={lookupQuery} onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Mail item ID or tracking #"
              className="flex-1 min-w-[220px] px-3 py-2 rounded-lg text-[13px] font-mono"
              style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
            <button type="button" onClick={onLookup} disabled={busy || !lookupQuery.trim()}
              className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {busy ? "Looking…" : "Look up"}
            </button>
          </div>

          {resolvedItem && (
            <>
              <div className="rounded-xl p-3 text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <p className="font-bold" style={{ color: T.ink }}>{resolvedItem.from}</p>
                <p style={{ color: T.inkSoft }}>
                  {resolvedItem.userName ?? "(no member)"} {resolvedItem.suiteNumber && <span className="font-mono">· #{resolvedItem.suiteNumber}</span>}
                  {" · "}{resolvedItem.type}
                  {resolvedItem.trackingNumber && <span className="font-mono"> · {resolvedItem.trackingNumber}</span>}
                </p>
                <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                  Intake {new Date(resolvedItem.createdAtIso).toLocaleDateString()} · declared {fmt$(resolvedItem.declaredValueCents)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-black mb-1" style={{ color: T.inkFaint }}>Carrier</p>
                  <div className="flex flex-wrap gap-1">
                    {CLAIM_CARRIERS.map((c) => (
                      <button key={c} type="button" onClick={() => setCarrier(c)}
                        className="text-[10.5px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: carrier === c ? T.blue : "white",
                          color: carrier === c ? "white" : T.ink,
                          border: `1px solid ${carrier === c ? T.blue : T.border}`,
                        }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black mb-1" style={{ color: T.inkFaint }}>Claim type</p>
                  <div className="flex flex-wrap gap-1">
                    {CLAIM_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => setClaimType(t)}
                        className="text-[10.5px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: claimType === t ? T.blue : "white",
                          color: claimType === t ? "white" : T.ink,
                          border: `1px solid ${claimType === t ? T.blue : T.border}`,
                        }}>
                        {CLAIM_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black mb-1" style={{ color: T.inkFaint }}>Internal notes (optional)</p>
                <input value={wizardNotes} onChange={(e) => setWizardNotes(e.target.value)} maxLength={600}
                  placeholder="e.g. carrier driver flagged box as 'crushed' on doorbell cam"
                  className="w-full px-3 py-2 rounded-lg text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
              </div>

              {livePrefill && (
                <div className="rounded-xl p-3" style={{ background: "rgba(25,118,255,0.04)", border: `1px solid ${T.border}` }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.blueDeep }}>
                    ↳ Pre-fill preview
                  </p>
                  <p className="text-[11.5px]" style={{ color: T.ink }}>
                    Will claim <strong>${livePrefill.claimedAmountDollars}</strong> for <em>{CLAIM_TYPE_LABELS[livePrefill.claimType]}</em>
                    {livePrefill.filingWindowDays != null && (
                      <span style={{ color: livePrefill.filingWindowExceeded ? T.danger : T.inkFaint }}>
                        {" · "}{livePrefill.daysSinceIntake}d since intake (window: {livePrefill.filingWindowDays}d{livePrefill.filingWindowExceeded ? " ⚠️ EXCEEDED" : ""})
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] mt-1" style={{ color: T.inkSoft }}>
                    {livePrefill.evidenceList.length} pieces of evidence will be packaged.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setWizardOpen(false)} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ color: T.inkSoft, background: "transparent" }}>
                  Cancel
                </button>
                <button type="button" onClick={onStartClaim} disabled={busy || !livePrefill}
                  className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                  {busy ? "Saving…" : "Start claim & open prefill"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

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

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 No claims in this view. Use "+ Start claim" when a package is damaged or lost.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const sc = CLAIM_STATUS_COLORS[r.status];
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-[0.10em] px-1.5 py-0.5 rounded" style={{ background: sc.bg, color: sc.fg }}>
                        {CLAIM_STATUS_LABELS[r.status]}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>
                        {r.carrier}
                      </span>
                      <span className="text-[11px] font-bold" style={{ color: T.ink }}>{CLAIM_TYPE_LABELS[r.claimType]}</span>
                      <span className="text-[12px] font-mono font-black" style={{ color: T.blueDeep }}>{fmt$(r.claimedAmountCents)}</span>
                      {r.status === "Paid" && r.paidAmountCents != null && (
                        <span className="text-[10.5px]" style={{ color: T.success }}>
                          → paid {fmt$(r.paidAmountCents)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] mt-1" style={{ color: T.ink }}>
                      <strong>{r.fromSender}</strong> → {r.userName ?? "(no member)"}
                      {r.suiteNumber && <span className="font-mono" style={{ color: T.inkFaint }}> · #{r.suiteNumber}</span>}
                    </p>
                    <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                      {r.trackingNumber && <span className="font-mono">{r.trackingNumber} · </span>}
                      Created {new Date(r.createdAtIso).toLocaleDateString()}
                      {r.carrierClaimNumber && <span> · carrier claim {r.carrierClaimNumber}</span>}
                      {r.denialReason && <span style={{ color: T.danger }}> · denied: {r.denialReason}</span>}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => openDetail(r.id)} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white" style={{ background: T.blue }}>
                      Open ↗
                    </button>
                    {r.status === "Draft" && (
                      <button type="button" onClick={() => onMarkFiled(r.id)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                        ✓ Mark filed
                      </button>
                    )}
                    {r.status === "Filed" && (
                      <>
                        <button type="button" onClick={() => onMarkPaid(r.id)} disabled={busy}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                          💸 Mark paid
                        </button>
                        <button type="button" onClick={() => onMarkDenied(r.id)} disabled={busy}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                          style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                          Mark denied
                        </button>
                      </>
                    )}
                    {r.status !== "Closed" && (
                      <button type="button" onClick={() => onClose(r.id)} disabled={busy}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                        style={{ background: "transparent", color: T.inkFaint }}>
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Detail / prefill modal */}
      {openClaimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }} onClick={closeDetail}>
          <div className="rounded-2xl bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5" style={{ border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
            {!detail ? (
              <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
            ) : (
              <ClaimDetail detail={detail} onClose={closeDetail} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimDetail({ detail, onClose }: { detail: { row: InsuranceClaimRow; prefill: ClaimPrefill; evidence: ClaimEvidence }; onClose: () => void }) {
  const { row, prefill, evidence } = detail;
  const sc = CLAIM_STATUS_COLORS[row.status];
  const portalUrl = CARRIER_PORTAL_URLS[row.carrier];

  function copy(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    // small UI cue is overkill; trust admin sees the OS copy indicator
    void label;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.20em]" style={{ color: T.blueDeep }}>Insurance claim · {row.carrier}</p>
          <h3 className="text-base font-black" style={{ color: T.ink }}>{row.fromSender} → {row.userName ?? "(no member)"}</h3>
          <p className="text-[11px]" style={{ color: T.inkFaint }}>
            <span className="text-[10px] font-black uppercase tracking-[0.10em] px-1.5 py-0.5 rounded mr-1" style={{ background: sc.bg, color: sc.fg }}>{CLAIM_STATUS_LABELS[row.status]}</span>
            {CLAIM_TYPE_LABELS[row.claimType]} · claim {row.carrierClaimNumber ?? "(not yet filed)"}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {portalUrl && (
            <a href={portalUrl} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white text-center" style={{ background: T.blueDeep, textDecoration: "none" }}>
              Open {row.carrier} portal ↗
            </a>
          )}
          {/* iter-203: Print-to-PDF claim package */}
          <a href={`/admin/print/insurance-claim/${row.id}`} target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white text-center" style={{ background: T.success, textDecoration: "none" }}>
            📄 Export PDF
          </a>
          <button type="button" onClick={onClose} className="text-[11px] font-bold px-3 py-1 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
            ✕ Close
          </button>
        </div>
      </div>

      {prefill.filingWindowExceeded && (
        <div className="rounded-xl p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.30)" }}>
          <p className="text-[11.5px] font-black" style={{ color: T.danger }}>
            ⚠️ Filing window exceeded — {prefill.daysSinceIntake}d since intake but {row.carrier} only accepts claims within {prefill.filingWindowDays}d. Carrier may auto-deny.
          </p>
        </div>
      )}

      <Section title="Form fields (paste into carrier portal)">
        <PrefillField label="Tracking #" value={prefill.trackingNumber ?? "—"} onCopy={copy} />
        <PrefillField label="Sender" value={prefill.senderName} onCopy={copy} />
        <PrefillField label="Recipient" value={prefill.recipientName} onCopy={copy} />
        <PrefillField label="Declared value" value={`$${prefill.declaredValueDollars}`} onCopy={copy} />
        <PrefillField label="Claim amount" value={`$${prefill.claimedAmountDollars}`} onCopy={copy} />
        {prefill.weightOz != null && <PrefillField label="Weight" value={`${prefill.weightOz}oz`} onCopy={copy} />}
        {prefill.dimensions && <PrefillField label="Dimensions" value={prefill.dimensions} onCopy={copy} />}
        <PrefillField label="Description" value={prefill.description} onCopy={copy} multi />
      </Section>

      <Section title="Evidence (paste into 'describe damage' or upload as PDF)">
        <pre className="text-[11px] font-mono whitespace-pre-wrap rounded-xl p-3" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}>
{prefill.evidenceList.join("\n")}
        </pre>
        <button type="button" onClick={() => copy(prefill.evidenceList.join("\n"), "evidence")}
          className="text-[10px] font-bold px-2 py-0.5 rounded mt-1" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
          📋 Copy all
        </button>
      </Section>

      {evidence.photos.length > 0 && (
        <Section title={`Photos (${evidence.photos.length})`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {evidence.photos.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label} className="w-full aspect-square rounded-lg object-cover" style={{ border: `1px solid ${T.border}` }} />
                <p className="text-[9.5px] mt-0.5" style={{ color: T.inkFaint }}>{p.label}</p>
              </a>
            ))}
          </div>
        </Section>
      )}

      {row.notes && (
        <Section title="Internal notes">
          <p className="text-[11.5px] italic" style={{ color: T.inkSoft }}>{row.notes}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PrefillField({ label, value, multi, onCopy }: { label: string; value: string; multi?: boolean; onCopy: (v: string, l: string) => void }) {
  return (
    <div className="rounded-lg p-2 flex items-start gap-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: T.inkFaint }}>{label}</p>
        <p className={`text-[12px] ${multi ? "" : "font-mono"} mt-0.5`} style={{ color: T.ink, whiteSpace: multi ? "normal" : "nowrap", overflowWrap: "anywhere" }}>{value}</p>
      </div>
      <button type="button" onClick={() => onCopy(value, label)} className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
        📋
      </button>
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
