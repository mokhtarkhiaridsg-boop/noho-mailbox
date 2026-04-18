"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type Delivery } from "./types";
import { IconTruck, IconClock } from "@/components/MemberIcons";
import { scheduleDelivery } from "@/app/actions/delivery";
import { uploadMemberLabel } from "@/app/actions/shippo";

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
    <div className="space-y-6">
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconTruck className="w-4 h-4" style={{ color: BRAND.blue }} />
            <h2
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Schedule Same-Day Delivery
            </h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            {showForm ? "Close" : "New Delivery"}
          </button>
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
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              Schedule Delivery
            </button>
          </form>
        )}
      </section>

      {/* History */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div
          className="px-6 py-4 flex items-center gap-2.5"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
        >
          <IconClock className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h3
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Delivery History
          </h3>
        </div>
        {deliveries.length === 0 ? (
          <p className="p-12 text-center text-sm" style={{ color: BRAND.inkSoft }}>
            No deliveries yet.
          </p>
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
                          ? "rgba(34,139,34,0.12)"
                          : BRAND.blueSoft,
                      color: d.status === "Delivered" ? "#1a8a1a" : BRAND.blueDeep,
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
                          background: s.done ? BRAND.blue : "rgba(14,34,64,0.15)",
                        }}
                      />
                      {idx < 3 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            background: s.done
                              ? BRAND.blue
                              : "rgba(14,34,64,0.1)",
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
      </section>

      {/* Label-from-Home Upload */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
              📦 Drop Off a Pre-Paid Label
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>
              Print your label at home, drop it off — we handle the rest.
            </p>
          </div>
          <button
            onClick={() => { setShowLabelUpload(!showLabelUpload); setLabelSuccess(false); }}
            className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
          >
            {showLabelUpload ? "Close" : "Upload Label"}
          </button>
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
                  background: labelFile ? "rgba(51,116,181,0.04)" : BRAND.bgDeep,
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
              { icon: "🖨️", title: "Print at Home", desc: "Print your prepaid label from any printer" },
              { icon: "🏪", title: "Drop Off", desc: "Bring it to NOHO Mailbox — we scan & submit" },
              { icon: "📬", title: "We Ship It", desc: "Your package is handed off to the carrier same day" },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl p-3 text-center" style={{ background: BRAND.bgDeep }}>
                <p className="text-xl mb-1">{s.icon}</p>
                <p className="font-black text-[11px]" style={{ color: BRAND.ink }}>{s.title}</p>
                <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
