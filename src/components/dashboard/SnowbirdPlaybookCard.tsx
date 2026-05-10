"use client";

/**
 * iter-213 — Snowbird forwarding playbook wizard (Tier 15 #122).
 *
 * One-tap "I'm leaving for the season" setup that bundles 4 features
 * (iter-192 default address, iter-194 default translate language,
 * iter-170 recurring forwarding, iter-206 plan pause). Renders as a
 * collapsed CTA card that expands into a 3-question wizard.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyPlaybookStatus,
  runSnowbirdPlaybook,
  type PlaybookStatus,
  type PlaybookRunResult,
} from "@/app/actions/snowbirdPlaybook";
import { listMyForwardingAddresses, type ForwardingAddressRow } from "@/app/actions/forwardingAddressBook";
import { ALL_FREQUENCIES, FREQUENCY_LABELS, type ForwardingFrequency } from "@/lib/scheduledForwarding";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/aiTranslation";

const STEP_LABELS: Record<string, string> = {
  address: "🏡 Default forwarding address",
  locale: "🌐 Translate language",
  recurring: "📦 Recurring forwarding cadence",
  pause: "⏸ Plan pause",
};

export default function SnowbirdPlaybookCard() {
  const [status, setStatus] = useState<PlaybookStatus | null | undefined>(undefined);
  const [addresses, setAddresses] = useState<ForwardingAddressRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlaybookRunResult | null>(null);

  // Wizard form state
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [addrId, setAddrId] = useState("");
  const [freq, setFreq] = useState<ForwardingFrequency>("weekly");
  const [locale, setLocale] = useState<LanguageCode | "">("");
  const [notes, setNotes] = useState("");

  function refresh() {
    void getMyPlaybookStatus().then(setStatus).catch(() => setStatus(null));
    void listMyForwardingAddresses().then(setAddresses).catch(() => setAddresses([]));
  }
  useEffect(refresh, []);

  // Auto-pre-fill default address pick when addresses load.
  useEffect(() => {
    if (!addresses || addrId) return;
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (def) setAddrId(def.id);
  }, [addresses, addrId]);

  function onRun() {
    setError(null); setResult(null);
    if (!start || !end) { setError("Pick start + end dates."); return; }
    if (!addrId) { setError("Pick a forwarding address (add one in Settings if you have none)."); return; }
    startTransition(async () => {
      const res = await runSnowbirdPlaybook({
        startDate: start, endDate: end,
        forwardingAddressId: addrId,
        recurringFrequency: freq,
        locale: locale || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(res);
      if (res.errors.length === 0) {
        setOpen(false);
        setStart(""); setEnd(""); setNotes("");
        refresh();
      }
    });
  }

  if (status === undefined) return null;

  // Hide entire card when member already has an active or scheduled pause
  // (keep the dashboard clean — they're already snowbirding).
  if (status?.activePause) return null;

  const hasAnyAddresses = (addresses?.length ?? 0) > 0;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border, background: "linear-gradient(140deg, #FFFBEA 0%, #F7E6C2 100%)" }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#92400e" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#F59E0B", boxShadow: "0 0 6px #F59E0B" }} />
            Smart bundle · Snowbird playbook
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            Leaving for the season? One tap sets up everything.
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Bundles your default forwarding address + translate language + recurring batch cadence + plan pause into one wizard. Auto-resumes when you&apos;re back.
          </p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: "#92400e" }}>
            🌴 Start setup
          </button>
        )}
      </div>

      {status?.scheduledPause && !open && (
        <p className="text-[11.5px] mt-3" style={{ color: "#15803d" }}>
          ✓ Pause already scheduled {status.scheduledPause.startDate} → {status.scheduledPause.endDate}
        </p>
      )}

      {open && (
        <div className="mt-4 rounded-xl p-4 space-y-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          {/* Step 1: When */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>1. When are you away?</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold" style={{ color: BRAND.inkFaint }}>Leave date</p>
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
              </div>
              <div>
                <p className="text-[10px] font-bold" style={{ color: BRAND.inkFaint }}>Return date</p>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
              </div>
            </div>
          </div>

          {/* Step 2: Where */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>2. Where should mail go?</p>
            {!hasAnyAddresses ? (
              <p className="text-[11.5px] italic" style={{ color: "#b91c1c" }}>
                You have no forwarding addresses on file. <a href="/dashboard?tab=settings" className="underline font-bold" style={{ color: BRAND.blueDeep }}>Add one in Settings</a> first, then come back.
              </p>
            ) : (
              <select value={addrId} onChange={(e) => setAddrId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }}>
                {addresses?.map((a) => (
                  <option key={a.id} value={a.id}>{a.isDefault ? "⭐ " : ""}{a.label} — {a.address.split("\n")[0]}</option>
                ))}
              </select>
            )}
          </div>

          {/* Step 3: How often */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>3. How often should we ship?</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_FREQUENCIES.map((f) => (
                <button key={f} type="button" onClick={() => setFreq(f)}
                  className="text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{
                    background: freq === f ? BRAND.blue : "white",
                    color: freq === f ? "white" : BRAND.ink,
                    border: `1px solid ${freq === f ? BRAND.blue : BRAND.border}`,
                  }}>
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Optional: locale */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>4. Translate scanned letters into… (optional)</p>
            <select value={locale} onChange={(e) => setLocale(e.target.value as LanguageCode | "")}
              className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }}>
              <option value="">Skip — leave as-is</option>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>Note (optional)</p>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200}
              placeholder="e.g. Snowbird Tucson Oct–Mar"
              className="w-full rounded-lg px-3 py-2 text-[12.5px]" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
          </div>

          {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-xs font-bold" style={{ color: BRAND.inkFaint }}>Cancel</button>
            <button type="button" onClick={onRun} disabled={busy || !hasAnyAddresses}
              className="text-xs font-black px-4 py-1.5 rounded-xl text-white disabled:opacity-50" style={{ background: "#92400e" }}>
              {busy ? "Setting up…" : "🌴 Run playbook"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl p-3" style={{ background: result.errors.length === 0 ? "rgba(34,197,94,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${result.errors.length === 0 ? "rgba(34,197,94,0.30)" : "rgba(245,158,11,0.40)"}` }}>
          <p className="text-[11.5px] font-black mb-2" style={{ color: result.errors.length === 0 ? "#15803d" : "#92400e" }}>
            {result.errors.length === 0 ? "✓ Playbook complete — have a great trip!" : `Setup partially complete — ${result.errors.length} step(s) need attention`}
          </p>
          <ul className="space-y-1">
            {result.steps.map((s) => (
              <li key={s.step} className="text-[11px] flex items-center gap-2" style={{ color: BRAND.ink }}>
                <span style={{ color: s.ok ? "#15803d" : "#b91c1c", fontWeight: 900 }}>{s.ok ? "✓" : "✕"}</span>
                <span className="font-bold">{STEP_LABELS[s.step] ?? s.step}</span>
                {s.detail && <span style={{ color: BRAND.inkFaint }}>· {s.detail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
