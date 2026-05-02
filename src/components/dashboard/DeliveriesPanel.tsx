"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { motion, AnimatePresence } from "motion/react";
import { BRAND, type Delivery } from "./types";
import { EmptyState } from "./ui";
import { IconTruck, IconClock } from "@/components/MemberIcons";
import { scheduleDelivery } from "@/app/actions/delivery";
import { uploadMemberLabel } from "@/app/actions/shippo";
import { setRecurringDelivery, cancelRecurringDelivery, getMyRecurringDelivery } from "@/app/actions/recurringDelivery";
import { useState as useLocalState, useTransition as useLocalTransition, useEffect } from "react";

function RecurringDeliveryCard({ addresses }: { addresses?: { id: string; label: string; address: string }[] }) {
  const [current, setCurrent] = useLocalState<any | null | undefined>(undefined);
  const [pending, startTransition] = useLocalTransition();
  const [showForm, setShowForm] = useLocalState(false);
  const [freq, setFreq] = useLocalState<"weekly" | "biweekly" | "monthly">("weekly");
  const [destination, setDestination] = useLocalState("");
  const [tier, setTier] = useLocalState<"standard" | "express">("standard");
  const [msg, setMsg] = useLocalState<string | null>(null);

  useEffect(() => { getMyRecurringDelivery().then(setCurrent); }, []);

  function save() {
    if (!destination) return;
    startTransition(async () => {
      await setRecurringDelivery({ frequency: freq, destination, tier });
      setMsg("✓ Recurring delivery set!");
      setShowForm(false);
      const updated = await getMyRecurringDelivery();
      setCurrent(updated);
    });
  }

  function cancel() {
    startTransition(async () => {
      await cancelRecurringDelivery();
      setMsg("Recurring delivery cancelled");
      setCurrent(null);
    });
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8 C2 4.5 5 2 8 2 C10.5 2 12.5 3.5 13.5 5.5" /><path d="M14 8 C14 11.5 11 14 8 14 C5.5 14 3.5 12.5 2.5 10.5" /><path d="M11 5.5 L13.5 5.5 L13.5 3 M5 10.5 L2.5 10.5 L2.5 13" /></svg>
            Recurring Delivery
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>Auto-delivery on a set schedule</p>
        </div>
        {current?.frequency && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(51,116,133,0.15)", color: BRAND.blueDeep }}>
            {current.frequency}
          </span>
        )}
      </div>

      {current?.frequency && !showForm ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>
            Next: <strong>{current.nextRunDate}</strong> · To: {current.destination.slice(0, 40)}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { setDestination(current.destination); setFreq(current.frequency); setTier(current.tier); setShowForm(true); }}
              className="text-xs font-black px-3 py-1.5 rounded-lg" style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.blueDeep }}>
              Edit
            </button>
            <button disabled={pending} onClick={cancel}
              className="text-xs font-black px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {(!current?.frequency || showForm) && (
        <div className="space-y-2.5">
          <div>
            <p className="text-[10px] font-black mb-1.5" style={{ color: BRAND.inkFaint }}>Frequency</p>
            <div className="flex gap-1.5">
              {(["weekly", "biweekly", "monthly"] as const).map((f) => (
                <button key={f} onClick={() => setFreq(f)}
                  className="text-xs font-black px-3 py-1.5 rounded-xl capitalize"
                  style={{ background: freq === f ? BRAND.blue : "white", color: freq === f ? "white" : BRAND.ink, border: `1px solid ${BRAND.border}` }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Delivery tier</p>
            <div className="flex gap-1.5">
              {([["standard", "Standard ($8)"], ["express", "Express ($15)"]] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTier(t)}
                  className="text-xs font-black px-3 py-1.5 rounded-xl"
                  style={{ background: tier === t ? BRAND.blue : "white", color: tier === t ? "white" : BRAND.ink, border: `1px solid ${BRAND.border}` }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black mb-1" style={{ color: BRAND.inkFaint }}>Delivery address</p>
            <input placeholder="123 Main St, Los Angeles, CA 90210" value={destination} onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: "white", border: `1px solid ${BRAND.border}` }} />
          </div>
          <div className="flex gap-2">
            <button disabled={!destination || pending} onClick={save}
              className="text-xs font-black px-4 py-1.5 rounded-xl text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
              {pending ? "Saving…" : "Save Schedule"}
            </button>
            {current?.frequency && <button onClick={() => setShowForm(false)} className="text-xs" style={{ color: BRAND.inkFaint }}>Cancel</button>}
          </div>
        </div>
      )}

      {msg && <p className="text-[11px] font-bold" style={{ color: msg.startsWith("✓") ? "#16a34a" : BRAND.inkSoft }}>{msg}</p>}
    </div>
  );
}

type Props = {
  deliveries: Delivery[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

export default function DeliveriesPanel({
  deliveries,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showLabelUpload, setShowLabelUpload] = useState(false);
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelCarrier, setLabelCarrier] = useState("USPS");
  const [labelTracking, setLabelTracking] = useState("");
  const [labelNotes, setLabelNotes] = useState("");
  const [labelUploading, setLabelUploading] = useState(false);
  const [labelSuccess, setLabelSuccess] = useState(false);

  async function handleLabelUpload() {
    if (!labelFile) return;
    setLabelUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", labelFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error("Upload failed");

      await uploadMemberLabel({
        filename: labelFile.name,
        url: uploadData.url,
        carrier: labelCarrier || undefined,
        trackingNum: labelTracking || undefined,
        notes: labelNotes || undefined,
      });
      setLabelSuccess(true);
      setLabelFile(null);
      setLabelTracking("");
      setLabelNotes("");
      router.refresh();
    } catch {
      setToast("Upload failed — please try again");
    } finally {
      setLabelUploading(false);
    }
  }

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  function timelineStep(d: Delivery) {
    const steps: { label: string; done: boolean }[] = [
      { label: "Pending", done: true },
      { label: "Picked Up", done: !!d.pickedUpAt || ["In Transit", "Delivered"].includes(d.status) },
      { label: "In Transit", done: !!d.inTransitAt || d.status === "Delivered" },
      { label: "Delivered", done: !!d.deliveredAt || d.status === "Delivered" },
    ];
    return steps;
  }

  return (
    <div className="space-y-5">
      {/* Schedule Same-Day Delivery */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-5 sm:p-6"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(51,116,133,0.10)" }}
            >
              <IconTruck className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
            </span>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(45,29,15,0.55)" }}
            >
              Same-day delivery
            </p>
          </div>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="text-[11.5px] font-semibold px-3.5 h-8 rounded-full transition-colors"
            style={{
              background: showForm ? "white" : "#337485",
              color: showForm ? "#337485" : "#F7EEC2",
              border: showForm ? "1px solid rgba(51,116,133,0.20)" : "none",
            }}
          >
            {showForm ? "Close" : "New delivery"}
          </motion.button>
        </div>

        {showForm && (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await scheduleDelivery({
                  destination: fd.get("destination") as string,
                  zip: fd.get("zip") as string,
                  itemType: fd.get("itemType") as string,
                  tier: (fd.get("tier") as "Standard" | "Rush" | "WhiteGlove") ?? "Standard",
                  recipientName: fd.get("recipientName") as string,
                  recipientPhone: fd.get("recipientPhone") as string,
                  instructions: (fd.get("instructions") as string) || undefined,
                });
                if (res?.error) {
                  refresh(res.error);
                  return;
                }
                setShowForm(false);
                refresh("Delivery scheduled");
              });
            }}
          >
            <input
              name="destination"
              placeholder="Destination address"
              required
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="zip"
              placeholder="ZIP"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="itemType"
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option>Documents</option>
              <option>Letter</option>
              <option>Package</option>
              <option>Other</option>
            </select>
            <input
              name="recipientName"
              placeholder="Recipient name"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="recipientPhone"
              placeholder="Recipient phone"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="tier"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option value="Standard">Standard — same day</option>
              <option value="Rush">Rush — within 2 hours (+60%)</option>
              <option value="WhiteGlove">White-Glove — door-to-door (+150%)</option>
            </select>
            <textarea
              name="instructions"
              rows={2}
              placeholder="Driver instructions (optional)"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <motion.button
              type="submit"
              disabled={isPending}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="sm:col-span-2 h-11 rounded-full text-[13px] font-semibold disabled:opacity-50 transition-colors"
              style={{
                background: "#337485",
                color: "#F7EEC2",
              }}
            >
              Schedule delivery
            </motion.button>
          </form>
        )}
      </motion.section>

      {/* History */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl overflow-hidden"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div
          className="px-5 py-3.5 flex items-center gap-2"
          style={{ borderBottom: "1px solid rgba(45,29,15,0.06)" }}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(51,116,133,0.10)" }}
          >
            <IconClock className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
          </span>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(45,29,15,0.55)" }}
          >
            Delivery history
          </p>
          {deliveries.length > 0 && (
            <span
              className="ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
              style={{ background: "rgba(45,29,15,0.05)", color: "rgba(45,29,15,0.65)" }}
            >
              {deliveries.length}
            </span>
          )}
        </div>
        {deliveries.length === 0 ? (
          <EmptyState
            tone="calm"
            title="No deliveries yet"
            body="Schedule a same-day delivery and we'll handle pickup, transit, and proof of delivery."
          />
        ) : (
          <ul>
            {deliveries.map((d, i) => (
              <li
                key={d.id}
                className="px-6 py-4"
                style={{
                  borderBottom:
                    i < deliveries.length - 1
                      ? `1px solid ${BRAND.border}`
                      : "none",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                      {d.destination}
                    </p>
                    <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                      {d.tier} · {d.date} · ${d.price.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        d.status === "Delivered"
                          ? "var(--color-success-soft)"
                          : BRAND.blueSoft,
                      color: d.status === "Delivered" ? "#166534" : BRAND.blueDeep,
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {timelineStep(d).map((s, idx) => (
                    <div
                      key={s.label}
                      className="flex-1 flex items-center"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: s.done ? BRAND.blue : BRAND.brownSoft,
                        }}
                      />
                      {idx < 3 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            background: s.done
                              ? BRAND.blue
                              : BRAND.brownSoft,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {timelineStep(d).map((s) => (
                    <span
                      key={s.label}
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: s.done ? BRAND.blueDeep : BRAND.inkFaint }}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {/* Label-from-Home Upload */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-5 sm:p-6"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(51,116,133,0.10)" }}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="#337485" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
                <path d="M8 1 L14 4 L14 12 L8 15 L2 12 L2 4 Z" />
                <path d="M2 4 L8 7 L14 4" />
                <path d="M8 7 L8 15" />
              </svg>
            </span>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "rgba(45,29,15,0.55)" }}
              >
                Pre-paid label drop-off
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(45,29,15,0.45)" }}>
                Print at home, drop off — we handle the rest.
              </p>
            </div>
          </div>
          <motion.button
            onClick={() => { setShowLabelUpload(!showLabelUpload); setLabelSuccess(false); }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="text-[11.5px] font-semibold px-3.5 h-8 rounded-full transition-colors shrink-0"
            style={{
              background: showLabelUpload ? "white" : "#337485",
              color: showLabelUpload ? "#337485" : "#F7EEC2",
              border: showLabelUpload ? "1px solid rgba(51,116,133,0.20)" : "none",
            }}
          >
            {showLabelUpload ? "Close" : "Upload label"}
          </motion.button>
        </div>

        {showLabelUpload && (
          labelSuccess ? (
            <div className="rounded-2xl p-5 text-center" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p className="text-2xl mb-2">✓</p>
              <p className="font-bold text-sm" style={{ color: "#166534" }}>Label received! We&apos;ll drop it off for you.</p>
              <button
                onClick={() => { setLabelSuccess(false); setShowLabelUpload(false); }}
                className="mt-3 text-xs font-bold underline"
                style={{ color: BRAND.blue }}
              >Upload another</button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* File drop zone */}
              <div
                className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors"
                style={{
                  borderColor: labelFile ? BRAND.blue : BRAND.border,
                  background: labelFile ? BRAND.bgDeep : BRAND.bgDeep,
                }}
                onClick={() => document.getElementById("label-file-input")?.click()}
              >
                <input
                  id="label-file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
                />
                {labelFile ? (
                  <div>
                    <p className="text-2xl mb-1">📄</p>
                    <p className="font-bold text-sm" style={{ color: BRAND.ink }}>{labelFile.name}</p>
                    <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>{(labelFile.size / 1024).toFixed(0)} KB · Click to change</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-1">⬆️</p>
                    <p className="font-bold text-sm" style={{ color: BRAND.ink }}>Drop your label here or click to browse</p>
                    <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>PDF, PNG, or JPG</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.inkFaint }}>Carrier</label>
                  <select
                    value={labelCarrier}
                    onChange={(e) => setLabelCarrier(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-sm font-semibold bg-white focus:outline-none"
                    style={{ border: `1px solid ${BRAND.border}` }}
                  >
                    {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.inkFaint }}>Tracking # (optional)</label>
                  <input
                    type="text"
                    value={labelTracking}
                    onChange={(e) => setLabelTracking(e.target.value)}
                    placeholder="9400111..."
                    className="w-full rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{ border: `1px solid ${BRAND.border}` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.inkFaint }}>Notes (optional)</label>
                <input
                  type="text"
                  value={labelNotes}
                  onChange={(e) => setLabelNotes(e.target.value)}
                  placeholder="Fragile, handle with care..."
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ border: `1px solid ${BRAND.border}` }}
                />
              </div>

              <button
                disabled={!labelFile || labelUploading}
                onClick={handleLabelUpload}
                className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-40 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
              >
                {labelUploading ? "Uploading…" : "Submit Label for Drop-Off"}
              </button>
            </div>
          )
        )}

        {!showLabelUpload && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                title: "Print at Home",
                desc: "Print your prepaid label from any printer",
                svg: <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="6" /><rect x="3" y="9" width="18" height="9" rx="1.5" /><rect x="6" y="14" width="12" height="6" /><circle cx="17" cy="12" r="0.8" fill="currentColor" /></svg>,
              },
              {
                title: "Drop Off",
                desc: "Bring it to NOHO Mailbox — we scan & submit",
                svg: <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 9 L4 4 L20 4 L21 9" /><rect x="3" y="9" width="18" height="12" /><rect x="10" y="13" width="4" height="8" /></svg>,
              },
              {
                title: "We Ship It",
                desc: "Your package is handed off to the carrier same day",
                svg: <svg viewBox="0 0 24 24" className="w-6 h-6 mx-auto" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><rect x="2" y="9" width="13" height="9" rx="1" /><path d="M15 12 L19 12 L21 14 L21 18 L15 18" /><circle cx="6" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" /></svg>,
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl p-3 text-center" style={{ background: BRAND.bgDeep }}>
                <div className="mb-1">{s.svg}</div>
                <p className="font-black text-[11px]" style={{ color: BRAND.ink }}>{s.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Recurring Delivery */}
      <RecurringDeliveryCard />
    </div>
  );
}
