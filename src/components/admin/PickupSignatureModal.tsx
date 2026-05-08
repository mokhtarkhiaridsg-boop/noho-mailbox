"use client";

/**
 * iter-137 — Pickup signature pad.
 *
 * Touch-friendly signature capture on a tablet at the bureau counter.
 * Pointer-events backed so it works with finger, stylus, mouse, and
 * Apple Pencil. We capture polylines as SVG path-data and ship that to
 * the server (no PNG/canvas rasterization → tiny payload + crisp re-
 * rendering at any size in receipts/PDFs).
 *
 * Flow:
 *   1. Customer signs on the pad
 *   2. Admin types/confirms signer name
 *   3. Click "Capture & mark Picked Up"
 *   4. Signature persists, status flips, modal closes
 *
 * The status flip is delegated to a callback so the calling panel can
 * decide whether to also fire `updateMailStatus`.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { recordPickupSignature, clearPickupSignature } from "@/app/actions/pickupSignature";

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
  danger: "#EF4444",
};

const PAD_W = 600;
const PAD_H = 200;

type Props = {
  mailItemId: string;
  packageFrom: string;
  defaultSignerName?: string;
  // Fired AFTER signature persists. Use it to flip MailItem.status.
  onCaptured?: (info: { signedAtIso: string }) => void;
  onClose: () => void;
};

type Stroke = { points: Array<[number, number]> };

export default function PickupSignatureModal({
  mailItemId,
  packageFrom,
  defaultSignerName = "",
  onCaptured,
  onClose,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ESC closes (only when not in the middle of a stroke).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !drawing) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawing, onClose]);

  function clientToPad(clientX: number, clientY: number): [number, number] {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * PAD_W;
    const y = ((clientY - rect.top) / rect.height) * PAD_H;
    return [
      Math.max(0, Math.min(PAD_W, x)),
      Math.max(0, Math.min(PAD_H, y)),
    ];
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = clientToPad(e.clientX, e.clientY);
    setDrawing(true);
    setStrokes((s) => [...s, { points: [p] }]);
    setErrorMsg(null);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing) return;
    const p = clientToPad(e.clientX, e.clientY);
    setStrokes((s) => {
      if (s.length === 0) return s;
      const last = s[s.length - 1]!;
      // Skip points <0.7px from the previous one to keep the path-data
      // size sane on long strokes (path data scales linearly with N).
      const prev = last.points[last.points.length - 1]!;
      if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.7) return s;
      const next = [...s];
      next[next.length - 1] = { points: [...last.points, p] };
      return next;
    });
  }

  function endStroke() {
    setDrawing(false);
  }

  function clearPad() {
    setStrokes([]);
    setErrorMsg(null);
  }

  // Convert strokes → single path-data string. M=move, L=line. Round to
  // 1 decimal place for compactness without visible quality loss.
  function strokesToPathData(strokes: Stroke[]): string {
    return strokes
      .filter((s) => s.points.length > 0)
      .map((s) => {
        const [first, ...rest] = s.points;
        const head = `M${first![0].toFixed(1)} ${first![1].toFixed(1)}`;
        if (rest.length === 0) return head + ` l0.1 0`; // tiny dot for single-tap
        const tail = rest.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
        return head + tail;
      })
      .join(" ");
  }

  const pathData = strokesToPathData(strokes);
  const isEmpty = strokes.every((s) => s.points.length === 0) || strokes.length === 0;

  function onCapture() {
    if (isEmpty) {
      setErrorMsg("Customer hasn't signed yet — ask them to sign on the pad");
      return;
    }
    if (!signerName.trim()) {
      setErrorMsg("Type the customer's legal name under the signature");
      return;
    }
    startTransition(async () => {
      const res = await recordPickupSignature({
        mailItemId,
        signaturePathData: pathData,
        signerName: signerName.trim(),
        viewBox: `0 0 ${PAD_W} ${PAD_H}`,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      if (res.signedAtIso) onCaptured?.({ signedAtIso: res.signedAtIso });
      onClose();
    });
  }

  function onWipeSavedSignature() {
    if (!confirm("Clear the saved signature for this package? This is logged in the audit trail.")) return;
    startTransition(async () => {
      const res = await clearPickupSignature({ mailItemId });
      if (res.error) { setErrorMsg(res.error); return; }
      clearPad();
      setSignerName("");
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={(e) => { if (!drawing) onClose(); /* ignore backdrop while drawing */ void e; }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Pickup signature
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {packageFrom ? `Package from ${packageFrom}` : "Capture customer signature"}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
              Customer signs below to confirm receipt. Signature is stored in the audit trail and included on the pickup receipt.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black transition-colors hover:bg-[#F4F5F7] disabled:opacity-40"
            style={{ color: T.inkSoft }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Signature pad */}
          <div
            className="relative rounded-xl overflow-hidden touch-none select-none"
            style={{
              background: "white",
              border: `2px solid ${isEmpty ? T.border : T.success}`,
              transition: "border-color 0.2s ease",
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${PAD_W} ${PAD_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="block w-full"
              style={{ aspectRatio: `${PAD_W} / ${PAD_H}`, cursor: "crosshair" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
            >
              {/* Baseline + X mark to anchor where to sign */}
              <line x1={20} y1={PAD_H - 30} x2={PAD_W - 20} y2={PAD_H - 30} stroke="#E5E7EB" strokeWidth={1} strokeDasharray="4 4" />
              <text x={26} y={PAD_H - 15} fontSize="11" fill="#9CA3AF" fontFamily="-apple-system, sans-serif">
                ✕  Sign here
              </text>
              {/* Live ink path */}
              {pathData && (
                <path
                  d={pathData}
                  fill="none"
                  stroke={T.ink}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {/* Empty-state hint overlay */}
            {isEmpty && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: T.inkFaint }}
              >
                Sign with finger or stylus
              </div>
            )}
          </div>

          {/* Signer name + clear */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                Signer&apos;s legal name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Print full name as on ID"
                maxLength={120}
                className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
                style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
              />
            </div>
            <button
              type="button"
              onClick={clearPad}
              disabled={pending || isEmpty}
              className="shrink-0 px-3 py-2 rounded-lg text-[11.5px] font-black disabled:opacity-40"
              style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
            >
              Clear pad
            </button>
          </div>

          {errorMsg && (
            <p className="text-[11px] font-semibold" style={{ color: T.danger }}>
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button
            type="button"
            onClick={onWipeSavedSignature}
            disabled={pending}
            className="text-[10.5px] font-bold underline-offset-2 hover:underline disabled:opacity-40"
            style={{ color: T.inkFaint }}
            title="Wipes any saved signature for this package — audit-logged"
          >
            Wipe saved signature
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="px-3 py-2 rounded-lg text-[11.5px] font-black disabled:opacity-40"
              style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCapture}
              disabled={pending || isEmpty || !signerName.trim()}
              className="px-3 py-2 rounded-lg text-[11.5px] font-black text-white disabled:opacity-40"
              style={{ background: T.blue }}
            >
              {pending ? "Saving…" : "Capture & mark Picked Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
