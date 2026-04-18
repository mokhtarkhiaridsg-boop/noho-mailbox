"use client";

import { BRAND, statusColor, type MailItem } from "./types";
import {
  IconMail,
  IconPackage,
  IconEye,
  IconScan,
  IconForward,
  IconTrash,
} from "@/components/MemberIcons";
import { requestForward, requestScan, requestDiscard } from "@/app/actions/mail";
import { togglePriorityFlag, addJunkSender } from "@/app/actions/mailPreferences";

type Props = {
  mailItems: MailItem[];
  isPending: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => void;
  setScanPreview: (url: string | null) => void;
};

export default function MailPanel({ mailItems, isPending, runAction, setScanPreview }: Props) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <IconMail className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
            Incoming Mail
          </h2>
        </div>
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-full"
          style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
        >
          {mailItems.length} ITEMS
        </span>
      </div>
      <div>
        {mailItems.length === 0 ? (
          <div className="p-12 text-center">
            <IconMail
              className="w-12 h-12 mx-auto mb-3"
              style={{ color: BRAND.inkFaint }}
              strokeWidth={1.2}
            />
            <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
              No mail items yet
            </p>
            <p className="text-xs mt-1" style={{ color: BRAND.inkFaint }}>
              We&apos;ll log your mail as it arrives.
            </p>
          </div>
        ) : (
          mailItems.map((item, i) => {
            const c = statusColor(item.status);
            const ItemIcon = item.type === "Package" ? IconPackage : IconMail;
            return (
              <div
                key={item.id}
                className="group px-4 sm:px-6 py-3 sm:py-4 transition-colors hover:bg-[#3374B5]/4"
                style={{
                  borderBottom: i < mailItems.length - 1 ? `1px solid ${BRAND.border}` : "none",
                }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
                    style={{
                      background:
                        item.type === "Package"
                          ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                          : `linear-gradient(135deg, ${BRAND.blueSoft}, rgba(51,116,181,0.18))`,
                      boxShadow:
                        item.type === "Package"
                          ? "0 4px 14px rgba(51,116,181,0.32)"
                          : "none",
                    }}
                  >
                    <ItemIcon
                      className="w-5 h-5"
                      style={{
                        color: item.type === "Package" ? "white" : BRAND.blueDeep,
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.priority && (
                        <span title="Priority" className="text-sm shrink-0">⭐</span>
                      )}
                      <p className="text-sm font-black truncate" style={{ color: item.junkBlocked ? BRAND.inkFaint : BRAND.ink }}>
                        {item.from}
                        {item.junkBlocked && <span className="ml-1 text-[10px] font-normal text-red-400">(junk)</span>}
                      </p>
                      {/* Mobile status dot */}
                      <span
                        className="sm:hidden w-2 h-2 rounded-full shrink-0"
                        style={{ background: c.dot }}
                        title={item.status}
                      />
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkFaint }}>
                      {item.date} · {item.type}
                      {item.label ? ` · ${item.label}` : ""}
                    </p>
                    {/* Mobile status text */}
                    <span
                      className="sm:hidden inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider mt-1"
                      style={{ color: c.fg }}
                    >
                      {item.status}
                    </span>
                  </div>
                  {/* Desktop status badge */}
                  <span
                    className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: c.dot }}
                    />
                    {item.status}
                  </span>
                </div>
                {/* Action buttons — grid on mobile for bigger touch targets */}
                <div className="flex gap-1.5 mt-2 sm:mt-0 ml-[52px] sm:ml-0">
                  {item.scanned && item.scanImageUrl && (
                    <button
                      onClick={() => setScanPreview(item.scanImageUrl)}
                      className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5"
                      style={{
                        background: BRAND.blueSoft,
                        color: BRAND.blueDeep,
                      }}
                      title="View Scan"
                    >
                      <IconEye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => runAction("Scan requested", () => requestScan(item.id))}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: BRAND.blueSoft,
                      color: BRAND.blueDeep,
                    }}
                    title="Request Scan"
                  >
                    <IconScan className="w-4 h-4" />
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => runAction("Forward requested", () => requestForward(item.id))}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: BRAND.blueSoft,
                      color: BRAND.blueDeep,
                    }}
                    title="Request Forward"
                  >
                    <IconForward className="w-4 h-4" />
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => runAction(item.priority ? "Priority removed" : "Marked priority", () => togglePriorityFlag(item.id))}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: item.priority ? "rgba(234,179,8,0.15)" : BRAND.blueSoft,
                      color: item.priority ? "#b45309" : BRAND.blueDeep,
                    }}
                    title={item.priority ? "Remove Priority Flag" : "Mark as Priority"}
                  >
                    <span className="text-sm">{item.priority ? "⭐" : "☆"}</span>
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm(`Block all mail from "${item.from}"?`)) return;
                      runAction("Sender blocked", () => addJunkSender(item.from));
                    }}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: item.junkBlocked ? "rgba(200,50,50,0.12)" : BRAND.blueSoft,
                      color: item.junkBlocked ? "#c03030" : BRAND.inkFaint,
                    }}
                    title="Block Sender"
                  >
                    <span className="text-xs">🚫</span>
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => runAction("Discard requested", () => requestDiscard(item.id))}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: "rgba(200,50,50,0.08)",
                      color: "#c03030",
                    }}
                    title="Request Discard"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
