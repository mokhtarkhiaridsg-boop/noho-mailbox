"use client";

import type { Customer } from "./types";

type LogMailForm = {
  suite: string;
  from: string;
  type: string;
  recipientName: string;
  recipientPhone: string;
  exteriorImageUrl: string;
  weightOz: string;
  dimensions: string;
};

// Parse "2 lb 4 oz", "2.5 lb", "36 oz", "36" (default oz) → ounces
function parseWeightToOz(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const mixed = s.match(/^([\d.]+)\s*(?:lb|lbs|pound|pounds|#)\s*([\d.]+)\s*(?:oz|ounce|ounces)?$/);
  if (mixed) {
    const lb = parseFloat(mixed[1]);
    const oz = parseFloat(mixed[2]);
    if (!isFinite(lb) || !isFinite(oz)) return null;
    return lb * 16 + oz;
  }
  const single = s.match(/^([\d.]+)\s*(lb|lbs|pound|pounds|#|oz|ounce|ounces)?$/);
  if (!single) return null;
  const v = parseFloat(single[1]);
  if (!isFinite(v)) return null;
  const u = single[2];
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds" || u === "#") return v * 16;
  return v; // bare number → oz (matches what server expects)
}

function ozToReadable(oz: number): string {
  if (oz < 16) return `${oz.toFixed(oz < 1 ? 2 : 1)} oz`;
  const lb = Math.floor(oz / 16);
  const remOz = +(oz - lb * 16).toFixed(1);
  return remOz === 0 ? `${lb} lb` : `${lb} lb ${remOz} oz`;
}

type Props = {
  customers: Customer[];
  logMailForm: LogMailForm;
  setLogMailForm: React.Dispatch<React.SetStateAction<LogMailForm>>;
  logMailPhotoUploading: boolean;
  handleLogMailPhotoUpload: (file: File) => Promise<void>;
  handleLogMailSubmit: () => void;
  isPending: boolean;
  onClose: () => void;
};

export function LogMailModal({
  customers,
  logMailForm,
  setLogMailForm,
  logMailPhotoUploading,
  handleLogMailPhotoUpload,
  handleLogMailSubmit,
  isPending,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
        <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
          <h3 className="font-black text-base uppercase tracking-wide text-text-light">Log Incoming Mail</h3>
          <button onClick={onClose} className="text-text-light/30 hover:text-text-light text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type selector — big buttons */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {["Letter", "Package"].map((t) => (
                <button key={t} type="button"
                  onClick={() => setLogMailForm((p) => ({ ...p, type: t }))}
                  className={`py-3 rounded-xl text-sm font-black border transition-colors ${logMailForm.type === t ? "bg-[#337485] text-white border-[#337485]" : "border-[#e8e5e0] text-text-light hover:border-[#337485]"}`}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Customer selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Customer / Suite *</label>
            <select value={logMailForm.suite}
              onChange={(e) => setLogMailForm((p) => ({ ...p, suite: e.target.value }))}
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]"
            >
              <option value="">— Select customer —</option>
              {customers
                .filter((c) => c.suiteNumber)
                .sort((a, b) => {
                  const n1 = parseInt(a.suiteNumber) || 0;
                  const n2 = parseInt(b.suiteNumber) || 0;
                  return n1 - n2;
                })
                .map((c) => (
                  <option key={c.id} value={c.suiteNumber}>
                    Suite #{c.suiteNumber} — {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* From */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">From / Sender *</label>
            <input type="text" value={logMailForm.from}
              onChange={(e) => setLogMailForm((p) => ({ ...p, from: e.target.value }))}
              placeholder="e.g. Amazon, IRS, Bank of America"
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]"
            />
          </div>

          {/* Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Addressed To</label>
              <input type="text" value={logMailForm.recipientName}
                onChange={(e) => setLogMailForm((p) => ({ ...p, recipientName: e.target.value }))}
                placeholder="Name on label"
                className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Recipient Phone</label>
              <input type="tel" value={logMailForm.recipientPhone}
                onChange={(e) => setLogMailForm((p) => ({ ...p, recipientPhone: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]"
              />
            </div>
          </div>

          {/* Weight + dimensions — mostly used for packages, but optional for letters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">
                Weight {logMailForm.weightOz ? <span className="font-normal text-text-light/40 normal-case">· {ozToReadable(parseFloat(logMailForm.weightOz))}</span> : null}
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={logMailForm.weightOz}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Store the parsed oz string, but accept lb/oz/mixed input freely
                  const oz = parseWeightToOz(raw);
                  setLogMailForm((p) => ({ ...p, weightOz: oz != null ? String(oz) : raw }));
                }}
                onBlur={(e) => {
                  const oz = parseWeightToOz(e.target.value);
                  if (oz != null) setLogMailForm((p) => ({ ...p, weightOz: String(oz) }));
                }}
                placeholder={logMailForm.type === "Package" ? "e.g. 2 lb 6 oz" : "Optional"}
                className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]"
              />
              <p className="text-[10px] text-text-light/40 mt-0.5">Accepts lb, oz, or &ldquo;lb&nbsp;oz&rdquo;</p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Dimensions (in)</label>
              <input
                type="text"
                value={logMailForm.dimensions}
                onChange={(e) => setLogMailForm((p) => ({ ...p, dimensions: e.target.value }))}
                placeholder={logMailForm.type === "Package" ? "e.g. 12x9x4" : "Optional"}
                className="w-full rounded-xl border border-border-light px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]"
              />
              <p className="text-[10px] text-text-light/40 mt-0.5">Triggers oversize alert if &gt;18&quot;</p>
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Photo of Mail</label>
            {logMailForm.exteriorImageUrl ? (
              <div className="relative">
                <img src={logMailForm.exteriorImageUrl} alt="Mail photo" className="w-full rounded-xl object-cover max-h-48" />
                <button
                  onClick={() => setLogMailForm((p) => ({ ...p, exteriorImageUrl: "" }))}
                  className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-red-500 shadow text-xs font-bold"
                >✕</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-[#e8e5e0] cursor-pointer hover:border-[#337485] transition-colors bg-[#f8f9fa]">
                <svg className="w-6 h-6 text-text-light/30 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                <span className="text-xs text-text-light/40">{logMailPhotoUploading ? "Uploading…" : "Tap to add photo"}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogMailPhotoUpload(f); }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleLogMailSubmit}
            disabled={isPending || !logMailForm.suite || !logMailForm.from}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
          >
            {isPending ? "Saving…" : `Log ${logMailForm.type} & Notify Customer`}
          </button>
          <button onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm font-bold text-text-light border border-[#e8e5e0] hover:bg-[#f5f3f0]"
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}
