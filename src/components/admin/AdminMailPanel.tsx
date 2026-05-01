"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { MailItem, Customer } from "./types";

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

type Props = {
  recentMail: MailItem[];
  customers: Customer[];
  mailFilter: string;
  setMailFilter: (f: string) => void;
  setShowLogMailModal: (show: boolean) => void;
  setLogMailForm: React.Dispatch<React.SetStateAction<LogMailForm>>;
  isPending: boolean;
  handleMailAction: (itemId: string, newStatus: string) => void;
  handleScanUpload: (mailItemId: string, file: File) => Promise<void>;
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

// Lifecycle bucketing — collapses every ~10 statuses into 4 board columns.
type Bucket = "action" | "scanned" | "awaiting" | "completed";

function bucketize(status: string): Bucket {
  if (status.endsWith("Requested") || status === "Received" || status === "Held") return "action";
  if (status === "Scanned") return "scanned";
  if (status === "Awaiting Pickup") return "awaiting";
  // Picked Up / Forwarded / Discarded / Returned / Shredded / Deposited / Completed
  return "completed";
}

const BUCKET_META: Record<
  Bucket,
  { title: string; sub: string; accent: string; bg: string; iconStroke: string; iconPath: React.ReactNode }
> = {
  action: {
    title: "Action Needed",
    sub: "Requests + just-received",
    accent: "#F5A623",
    bg: "linear-gradient(180deg, rgba(245,166,35,0.10) 0%, rgba(245,166,35,0.02) 60%, transparent 100%)",
    iconStroke: "#F5A623",
    iconPath: (
      <>
        <path d="M12 8 L12 13" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="9" />
      </>
    ),
  },
  scanned: {
    title: "Scanned",
    sub: "Image uploaded · awaiting next step",
    accent: NOHO_BLUE,
    bg: "linear-gradient(180deg, rgba(51,116,133,0.10) 0%, rgba(51,116,133,0.02) 60%, transparent 100%)",
    iconStroke: NOHO_BLUE,
    iconPath: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 12 L21 12" />
      </>
    ),
  },
  awaiting: {
    title: "Awaiting Pickup",
    sub: "Sitting at the desk for the customer",
    accent: "#7C3AED",
    bg: "linear-gradient(180deg, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0.02) 60%, transparent 100%)",
    iconStroke: "#7C3AED",
    iconPath: (
      <>
        <path d="M5 12 L5 20 L19 20 L19 12" />
        <path d="M3 12 L21 12 L17 6 L7 6 Z" />
      </>
    ),
  },
  completed: {
    title: "Completed",
    sub: "Picked up · forwarded · discarded",
    accent: "#16A34A",
    bg: "linear-gradient(180deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.02) 60%, transparent 100%)",
    iconStroke: "#16A34A",
    iconPath: <path d="M5 12 L10 17 L19 7" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

function MailIconBadge({ type }: { type: string }) {
  const isPackage = type === "Package";
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{
        background: isPackage
          ? `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`
          : "linear-gradient(135deg, #EBF2FA, #D4E4F4)",
        boxShadow: isPackage ? `0 4px 12px rgba(51,116,133,0.32)` : "0 1px 3px rgba(45,16,15,0.06)",
      }}
    >
      {isPackage ? (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round">
          <path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" />
          <path d="M3 7 L12 11 L21 7" />
          <path d="M12 11 L12 21" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={NOHO_BLUE} strokeWidth="2" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 8 L12 14 L21 8" />
        </svg>
      )}
    </div>
  );
}

function MailItemCard({
  m,
  isPending,
  onAction,
  onScanUpload,
}: {
  m: MailItem;
  isPending: boolean;
  onAction: (id: string, s: string) => void;
  onScanUpload: (id: string, f: File) => void;
}) {
  return (
    <div
      className="group rounded-xl p-3 transition-all hover:-translate-y-0.5"
      style={{
        background: "white",
        border: "1px solid rgba(232,229,224,0.7)",
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 10px rgba(45,16,15,0.03)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <MailIconBadge type={m.type} />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold truncate" style={{ color: NOHO_INK }}>
            {m.from}
          </p>
          <p className="text-[10px] truncate" style={{ color: "rgba(45,16,15,0.5)" }}>
            #{m.suiteNumber} · {m.customerName.split(" ")[0]} · {m.date}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5">
        <StatusBadge status={m.status} />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {m.status.includes("Requested") && (
            <button
              onClick={() => {
                const target =
                  m.status === "Scan Requested"
                    ? "Scanned"
                    : m.status === "Forward Requested"
                    ? "Forwarded"
                    : m.status === "Discard Requested"
                    ? "Discarded"
                    : "Awaiting Pickup";
                onAction(m.id, target);
              }}
              disabled={isPending}
              className="px-2 h-7 rounded-md text-[9px] font-black text-white disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}
              title="Fulfill request"
            >
              FULFILL
            </button>
          )}
          <label
            title="Upload scan image"
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-blue-50 cursor-pointer"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={NOHO_BLUE} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onScanUpload(m.id, f); }} />
          </label>
          <button
            onClick={() => onAction(m.id, "Scanned")}
            disabled={isPending}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#337485]/10 disabled:opacity-40"
            title="Mark Scanned"
            aria-label="Mark Scanned"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke={NOHO_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 12 L21 12" />
            </svg>
          </button>
          <button
            onClick={() => onAction(m.id, "Picked Up")}
            disabled={isPending}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#16a34a]/10 disabled:opacity-40"
            title="Mark Picked Up"
            aria-label="Mark Picked Up"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12 L10 17 L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminMailPanel({
  recentMail,
  customers: _customers,
  mailFilter,
  setMailFilter,
  setShowLogMailModal,
  setLogMailForm,
  isPending,
  handleMailAction,
  handleScanUpload,
}: Props) {
  void _customers;
  const [view, setView] = useState<"board" | "list">("board");

  const buckets: Record<Bucket, MailItem[]> = {
    action: [],
    scanned: [],
    awaiting: [],
    completed: [],
  };
  for (const m of recentMail) buckets[bucketize(m.status)].push(m);

  const filteredMail =
    mailFilter === "All" ? recentMail : recentMail.filter((m) => m.status === mailFilter);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayCount = recentMail.filter((m) => m.date === todayStr).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Mail & Packages</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            {recentMail.length} recent · {todayCount} today · {buckets.action.length} need action
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: "rgba(232,229,224,0.5)", border: "1px solid rgba(232,229,224,0.7)" }}
          >
            {(["board", "list"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.16em] transition-all"
                  style={{
                    background: active ? "white" : "transparent",
                    color: active ? NOHO_INK : "rgba(45,16,15,0.55)",
                    boxShadow: active ? "0 1px 2px rgba(45,16,15,0.08)" : undefined,
                  }}
                  aria-pressed={active}
                >
                  {v === "board" ? "Board" : "List"}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
              setShowLogMailModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
          >
            + Log Mail
          </button>
          <button
            onClick={() => {
              setLogMailForm({ suite: "", from: "", type: "Package", recipientName: "", recipientPhone: "", exteriorImageUrl: "", weightOz: "", dimensions: "" });
              setShowLogMailModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-text-light bg-white"
            style={{ border: "1px solid rgba(232,229,224,0.7)" }}
          >
            + Log Package
          </button>
        </div>
      </div>

      {/* ─── BOARD VIEW — kanban columns ─────────────────────────────── */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.keys(BUCKET_META) as Bucket[]).map((b) => {
            const meta = BUCKET_META[b];
            const items = buckets[b];
            return (
              <section
                key={b}
                className="rounded-2xl p-3 flex flex-col"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.accent}33`,
                  minHeight: 240,
                }}
                aria-labelledby={`mail-col-${b}`}
              >
                <header className="flex items-center justify-between gap-2 mb-3 px-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "white", boxShadow: `0 1px 2px ${meta.accent}33` }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={meta.iconStroke} strokeWidth="2">
                        {meta.iconPath}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p
                        id={`mail-col-${b}`}
                        className="text-[11px] font-black uppercase tracking-[0.14em]"
                        style={{ color: NOHO_INK }}
                      >
                        {meta.title}
                      </p>
                      <p className="text-[9px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                        {meta.sub}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: items.length > 0 ? meta.accent : "rgba(232,229,224,0.7)",
                      color: items.length > 0 ? "white" : "rgba(45,16,15,0.55)",
                      boxShadow: items.length > 0 ? `0 0 10px ${meta.accent}55` : undefined,
                    }}
                  >
                    {items.length}
                  </span>
                </header>

                <div className="space-y-2 flex-1">
                  {items.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-center text-[11px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.5)",
                        border: "1px dashed rgba(45,16,15,0.15)",
                        color: "rgba(45,16,15,0.4)",
                      }}
                    >
                      Nothing here.
                    </div>
                  ) : (
                    items.map((m) => (
                      <MailItemCard
                        key={m.id}
                        m={m}
                        isPending={isPending}
                        onAction={handleMailAction}
                        onScanUpload={handleScanUpload}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW (legacy, with filter chips) ────────────────────── */}
      {view === "list" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {[
              "All",
              "Scan Requested",
              "Forward Requested",
              "Discard Requested",
              "Pickup Requested",
              "Awaiting Pickup",
              "Scanned",
              "Forwarded",
              "Held",
            ].map((f) => (
              <button
                key={f}
                onClick={() => setMailFilter(f)}
                className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                style={{
                  background: mailFilter === f ? "#1A1714" : "white",
                  color: mailFilter === f ? "#FAFAF8" : "rgba(26,23,20,0.6)",
                  boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <div
            className="rounded-2xl overflow-hidden bg-white"
            style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
          >
            {filteredMail.length === 0 && (
              <div className="px-5 py-12 text-center text-sm" style={{ color: "rgba(45,16,15,0.5)" }}>
                No mail items{mailFilter !== "All" ? ` with status "${mailFilter}"` : ""}.
              </div>
            )}
            {filteredMail.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-bg-light/15 transition-colors"
                style={{
                  borderBottom: i < filteredMail.length - 1 ? "1px solid rgba(232,229,224,0.35)" : "none",
                }}
              >
                <div className="flex items-center gap-4">
                  <MailIconBadge type={m.type} />
                  <div>
                    <p className="text-sm font-bold text-text-light">{m.from}</p>
                    <p className="text-xs text-text-light/40">
                      To: {m.customerName} (Suite #{m.suiteNumber}) · {m.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={m.status} />
                  <div className="flex gap-1">
                    {m.status.includes("Requested") && (
                      <button
                        onClick={() => {
                          const target =
                            m.status === "Scan Requested"
                              ? "Scanned"
                              : m.status === "Forward Requested"
                              ? "Forwarded"
                              : m.status === "Discard Requested"
                              ? "Discarded"
                              : "Awaiting Pickup";
                          handleMailAction(m.id, target);
                        }}
                        disabled={isPending}
                        className="px-3 h-8 rounded-lg text-[10px] font-black text-white hover:opacity-90 disabled:opacity-40"
                        style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}
                        title="Fulfill request"
                      >
                        FULFILL
                      </button>
                    )}
                    <label title="Upload scan image" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke={NOHO_BLUE} strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanUpload(m.id, f); }} />
                    </label>
                    <button
                      onClick={() => handleMailAction(m.id, "Scanned")}
                      disabled={isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#337485]/10 disabled:opacity-40"
                      title="Mark Scanned"
                      aria-label="Mark Scanned"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={NOHO_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <path d="M3 12 L21 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMailAction(m.id, "Forwarded")}
                      disabled={isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#337485]/10 disabled:opacity-40"
                      title="Mark Forwarded"
                      aria-label="Mark Forwarded"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={NOHO_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 6 L20 12 L14 18" />
                        <path d="M4 12 L20 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMailAction(m.id, "Picked Up")}
                      disabled={isPending}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#16a34a]/10 disabled:opacity-40"
                      title="Mark Picked Up"
                      aria-label="Mark Picked Up"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12 L10 17 L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
