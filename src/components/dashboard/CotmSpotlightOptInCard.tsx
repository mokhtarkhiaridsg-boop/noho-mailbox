"use client";

/**
 * iter-169 — CotM marketing spotlight opt-in card.
 *
 * Mounted under <CustomerOfMonthBadge>. Renders only for users who
 * have at least one CotM award AND haven't already submitted+published
 * a slot. States:
 *
 *   no slot           → "Get featured on the homepage" CTA + form
 *   pending           → "Submitted — awaiting review" status
 *   published         → "Live on nohomailbox.org" status + Retract
 *   rejected          → rejection reason + "Edit + resubmit" CTA
 *   retracted         → "Removed — resubmit anytime" CTA
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getMyCotmAwards, type MyCotmAward } from "@/app/actions/customerOfMonth";
import {
  getMyCotmSlots,
  submitCotmSpotlight,
  retractMyCotmSpotlight,
  getMyAwardIdForMonth,
  type MyCotmSlotRow,
} from "@/app/actions/cotmMarketingSlot";

export default function CotmSpotlightOptInCard() {
  const [awards, setAwards] = useState<MyCotmAward[] | null>(null);
  const [slots, setSlots] = useState<MyCotmSlotRow[] | null>(null);

  function refresh() {
    void getMyCotmAwards().then(setAwards).catch(() => setAwards([]));
    void getMyCotmSlots().then(setSlots).catch(() => setSlots([]));
  }
  useEffect(refresh, []);

  if (!awards || awards.length === 0) return null; // not a winner — render nothing
  // Use the latest award for the opt-in target; older awards stay
  // historic only.
  const latestAward = awards[0]!;

  // Find the matching slot for the latest award (1:1 by awardId).
  // Need the awardId on the award type — let's look it up by year+month.
  // The action returns year/month/citation but no id. We'll compare via
  // the slot's year/month instead.
  const slot = slots?.find((s) => s.year === latestAward.year && s.month === latestAward.month) ?? null;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#92400e" }}>
          ★ Spotlight · {latestAward.monthName} {latestAward.year}
        </p>
        <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
          Get featured on our homepage
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          As Customer of the Month, you can opt in to a marketing spotlight on nohomailbox.org. Show off your business + a 1-sentence quote to thousands of visitors per month.
        </p>
      </div>

      <SlotEditor slot={slot} awardId={null} latestAward={latestAward} onChanged={refresh} />
    </section>
  );
}

// awardId is optional on first render because we don't yet know it from
// the awards list. The submit handler infers it from a server lookup
// against year+month.
function SlotEditor({ slot, awardId, latestAward, onChanged }: {
  slot: MyCotmSlotRow | null;
  awardId: string | null;
  latestAward: MyCotmAward;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<boolean>(slot == null || slot.status === "rejected" || slot.status === "retracted");
  const [businessName, setBusinessName] = useState(slot?.businessName ?? "");
  const [quote, setQuote] = useState(slot?.quote ?? "");
  const [photoUrl, setPhotoUrl] = useState(slot?.photoUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(slot?.websiteUrl ?? "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resolve the awardId before submitting. Uses a tiny server action
  // (no API route needed) that returns the id for the member's award
  // matching the given year+month.
  async function resolveAwardId(): Promise<string | null> {
    if (slot?.awardId) return slot.awardId;
    if (awardId) return awardId;
    return getMyAwardIdForMonth({ year: latestAward.year, month: latestAward.month });
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const id = await resolveAwardId();
      if (!id) { setError("Couldn't find your award. Refresh + try again."); return; }
      const res = await submitCotmSpotlight({
        awardId: id,
        businessName, quote,
        photoUrl: photoUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
      });
      if (!res.ok) { setError(res.error ?? "Submit failed."); return; }
      setEditing(false);
      onChanged();
    });
  }

  function onRetract() {
    if (!slot) return;
    if (!confirm("Take down your homepage spotlight?")) return;
    startTransition(async () => {
      const res = await retractMyCotmSpotlight({ id: slot.id });
      if (res.error) { setError(res.error); return; }
      onChanged();
    });
  }

  if (slot && !editing) {
    return <SlotStatusView slot={slot} onEdit={() => setEditing(true)} onRetract={onRetract} />;
  }

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
      {slot?.status === "rejected" && slot.rejectionReason && (
        <div className="mb-3 rounded-lg p-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.30)" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#b91c1c" }}>
            Rejected · please revise
          </p>
          <p className="text-[11.5px] mt-1" style={{ color: BRAND.ink }}>{slot.rejectionReason}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Business name</label>
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} placeholder="Acme Coffee Co." className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Website (optional)</label>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={300} placeholder="https://acme.coffee" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Photo URL (optional)</label>
        <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} maxLength={500} placeholder="https://your-photo.jpg" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkSoft }}>HTTPS only. Square or 1:1 photo works best.</p>
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>Quote · 1 sentence</label>
        <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} maxLength={200} placeholder="NOHO Mailbox saved my life when I moved my LLC across town." className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] resize-none" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
        <p className="text-[10px] mt-0.5 text-right" style={{ color: BRAND.inkSoft }}>{quote.length}/200</p>
      </div>
      {error && <p className="mt-2 text-[11px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        {slot && (
          <button type="button" onClick={() => setEditing(false)} className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>Cancel</button>
        )}
        <button type="button" disabled={busy} onClick={onSubmit} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
          {busy ? "Submitting…" : slot ? "Resubmit for review" : "Submit for review"}
        </button>
      </div>
      <p className="mt-2 text-[10px]" style={{ color: BRAND.inkSoft }}>
        Admin reviews before publishing. You can retract anytime.
      </p>
    </div>
  );
}

function SlotStatusView({ slot, onEdit, onRetract }: {
  slot: MyCotmSlotRow;
  onEdit: () => void;
  onRetract: () => void;
}) {
  const statusStyle = {
    pending:   { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "AWAITING REVIEW" },
    published: { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "LIVE ON HOMEPAGE" },
    retracted: { bg: "rgba(120,113,108,0.12)", fg: "#57534e", label: "RETRACTED" },
    rejected:  { bg: "rgba(239,68,68,0.10)",  fg: "#991b1b", label: "REJECTED" },
  }[slot.status];

  return (
    <div className="mt-4 rounded-xl p-4" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: statusStyle.bg, color: statusStyle.fg }}>{statusStyle.label}</span>
        {slot.publishedAtIso && (
          <span className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
            Live since {new Date(slot.publishedAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-3 flex-wrap">
        {slot.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ border: `1px solid ${BRAND.border}` }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>{slot.businessName}</p>
          <blockquote className="mt-1 text-[12px] italic" style={{ color: BRAND.inkSoft, borderLeft: `2px solid ${BRAND.blue}`, paddingLeft: 8 }}>
            “{slot.quote}”
          </blockquote>
          {slot.websiteUrl && (
            <a href={slot.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10.5px] font-mono mt-1 inline-block" style={{ color: BRAND.blueDeep }}>
              {slot.websiteUrl} ↗
            </a>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onEdit} className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
          Edit
        </button>
        {slot.status !== "retracted" && (
          <button type="button" onClick={onRetract} className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
            {slot.status === "published" ? "Take down" : "Retract"}
          </button>
        )}
      </div>
    </div>
  );
}
