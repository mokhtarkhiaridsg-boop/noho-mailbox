"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { processPickupByToken } from "@/app/actions/qrPickup";

type PickupItem = { id: string; from: string; type: string; status: string };

type PickupResult = {
  success: boolean;
  user?: { id: string; name: string; suiteNumber: string | null };
  pickedUp?: number;
  items?: PickupItem[];
  error?: string;
};

type RecentPickup = {
  ts: number;
  customerName: string;
  suiteNumber: string | null;
  count: number;
  items: PickupItem[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function AdminQRPickupPanel() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<PickupResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [recents, setRecents] = useState<RecentPickup[]>([]);
  const [scanState, setScanState] = useState<"idle" | "processing" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus + keep input focused for fast successive scans.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function process() {
    const cleaned = token.trim().toUpperCase();
    if (!cleaned) return;

    setResult(null);
    setScanState("processing");
    startTransition(async () => {
      const res = (await processPickupByToken(cleaned)) as PickupResult;
      setResult(res);
      if (res.success) {
        if (res.pickedUp && res.pickedUp > 0 && res.user) {
          setRecents((prev) => [
            {
              ts: Date.now(),
              customerName: res.user!.name,
              suiteNumber: res.user!.suiteNumber,
              count: res.pickedUp ?? 0,
              items: res.items ?? [],
            },
            ...prev.slice(0, 9),
          ]);
        }
        setToken("");
        inputRef.current?.focus();
        setScanState("success");
        // Auto-clear success state after 2s so the result tile fades back to neutral.
        window.setTimeout(() => setScanState("idle"), 2000);
      } else {
        setScanState("error");
        window.setTimeout(() => setScanState("idle"), 2400);
      }
    });
  }

  const todayCount = recents.filter((r) => Date.now() - r.ts < 86_400_000).length;
  const totalItemsToday = recents
    .filter((r) => Date.now() - r.ts < 86_400_000)
    .reduce((sum, r) => sum + r.count, 0);

  const scanZoneAccent =
    scanState === "success" ? "#16A34A" : scanState === "error" ? "#dc2626" : NOHO_BLUE;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
          Express QR Pickup
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
          Scan member QR · type the 8-character code · pickup is logged the moment the code matches
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiTile
          label="Pickups today"
          value={String(todayCount)}
          sub={`${totalItemsToday} items collected`}
          accent
        />
        <KpiTile
          label="Session"
          value={String(recents.length)}
          sub="This admin session"
        />
        <KpiTile
          label="Avg per pickup"
          value={recents.length > 0 ? (recents.reduce((s, r) => s + r.count, 0) / recents.length).toFixed(1) : "—"}
          sub="Items per scan"
        />
      </div>

      {/* ─── SCAN ZONE — hero card with animated scanning rings ────── */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(26,46,58,0.95) 0%, rgba(14,24,32,0.98) 60%, #0A1218 100%)",
          boxShadow: "0 20px 60px rgba(10,18,24,0.4), inset 0 1px 0 rgba(247,230,194,0.05)",
        }}
      >
        {/* Background glow + grid */}
        <div
          aria-hidden="true"
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: scanZoneAccent }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,230,194,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(247,230,194,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        <div className="relative">
          {/* Status pill */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="relative inline-flex w-2 h-2"
              >
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{
                    background: scanZoneAccent,
                    animation: "noho-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                  }}
                />
                <span
                  className="relative inline-flex rounded-full w-2 h-2"
                  style={{ background: scanZoneAccent, boxShadow: `0 0 8px ${scanZoneAccent}` }}
                />
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ color: scanZoneAccent }}
              >
                {scanState === "processing"
                  ? "Reading…"
                  : scanState === "success"
                  ? "✓ Pickup logged"
                  : scanState === "error"
                  ? "✗ Token invalid"
                  : "Ready to scan"}
              </span>
            </div>
            <span className="text-[10px] font-bold" style={{ color: "rgba(247,230,194,0.4)" }}>
              QR · BARCODE · KEYBOARD
            </span>
          </div>

          {/* Scanning frame with corner brackets */}
          <div className="relative mx-auto max-w-md">
            {/* Animated scan-line on success/processing — subtle pulse */}
            {(scanState === "processing" || scanState === "success") && (
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, transparent, ${scanZoneAccent}33, transparent)`,
                  animation: "noho-scan 1.5s ease-in-out infinite",
                }}
              />
            )}

            {/* Token input — large monospace */}
            <input
              ref={inputRef}
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") process();
              }}
              placeholder="ENTER 8-CHAR CODE"
              className="w-full font-mono font-black text-3xl sm:text-4xl tracking-[0.3em] text-center rounded-2xl px-4 py-5 transition-all"
              style={{
                background: "rgba(247,230,194,0.08)",
                border: `2px solid ${scanZoneAccent}`,
                color: NOHO_CREAM,
                boxShadow: `0 0 0 4px ${scanZoneAccent}22, inset 0 1px 0 rgba(247,230,194,0.06)`,
                fontVariantLigatures: "none",
              }}
              autoFocus
              maxLength={32}
              aria-label="Pickup token"
            />

            {/* Corner brackets — purely cosmetic, give the QR-scanner vibe */}
            <span aria-hidden="true" className="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: scanZoneAccent }} />
            <span aria-hidden="true" className="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: scanZoneAccent }} />
            <span aria-hidden="true" className="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: scanZoneAccent }} />
            <span aria-hidden="true" className="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: scanZoneAccent }} />
          </div>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              disabled={!token.trim() || pending}
              onClick={process}
              className="px-5 h-10 rounded-md text-sm font-bold uppercase tracking-[0.10em] text-white disabled:opacity-40 transition-colors"
              style={{
                background: NOHO_INK,
                border: `1px solid ${NOHO_INK}`,
              }}
            >
              {pending ? "Processing…" : "Process pickup"}
            </button>
            <button
              onClick={() => {
                setToken("");
                setResult(null);
                setScanState("idle");
                inputRef.current?.focus();
              }}
              className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em]"
              style={{
                background: "rgba(247,230,194,0.06)",
                color: "rgba(247,230,194,0.65)",
                border: "1px solid rgba(247,230,194,0.12)",
              }}
            >
              Clear
            </button>
          </div>

          <p className="text-[10px] text-center mt-3" style={{ color: "rgba(247,230,194,0.35)" }}>
            Barcode scanner auto-submits · Press <kbd className="font-mono">Enter</kbd> to confirm
          </p>
        </div>
      </div>

      {/* Result tile — last scan outcome (flat hairline w/ accent dot). */}
      {result && (
        <div
          className="rounded-md p-4 transition-colors"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${result.success ? "rgba(22,163,74,0.4)" : "rgba(220,38,38,0.4)"}`,
          }}
        >
          {result.error ? (
            <div className="text-center py-2">
              <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-2" fill="none" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round">
                <circle cx="24" cy="24" r="20" />
                <path d="M16 16 L32 32 M32 16 L16 32" />
              </svg>
              <p className="font-black text-base" style={{ color: "#b91c1c" }}>{result.error}</p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                {result.pickedUp! > 0 ? (
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      background: "#16A34A",
                      border: "1px solid #166534",
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12 L10 17 L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: NOHO_INK, border: `1px solid ${NOHO_INK}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8 L12 13 M12 16 L12.01 16" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg truncate" style={{ color: NOHO_INK }}>
                    {result.user?.name}
                  </p>
                  {result.user?.suiteNumber && (
                    <p className="text-sm" style={{ color: "rgba(45,16,15,0.6)" }}>
                      Suite #{result.user.suiteNumber}
                    </p>
                  )}
                  {result.pickedUp! > 0 ? (
                    <p
                      className="inline-block text-xs font-black mt-2 px-3 py-1 rounded-md"
                      style={{ background: "rgba(22,163,74,0.12)", color: "#15803d" }}
                    >
                      ✓ {result.pickedUp} item{result.pickedUp !== 1 ? "s" : ""} marked Picked Up
                    </p>
                  ) : (
                    <p className="text-sm mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                      No items awaiting pickup for this customer.
                    </p>
                  )}
                </div>
              </div>

              {result.pickedUp! > 0 && result.items && result.items.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {result.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5"
                      style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(232,229,224,0.7)" }}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          background: "#F4EEE3",
                          border: "1px solid #E5DACA",
                        }}
                      >
                        {item.type === "Package" ? (
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke={NOHO_INK} strokeWidth="1.6" strokeLinejoin="round">
                            <path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" />
                            <path d="M3 7 L12 11 L21 7" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke={NOHO_INK} strokeWidth="1.6" strokeLinejoin="round">
                            <rect x="3" y="6" width="18" height="13" rx="2" />
                            <path d="M3 8 L12 14 L21 8" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate" style={{ color: NOHO_INK }}>{item.from}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* Recent pickups (this admin session) */}
      {recents.length > 0 && (
        <div
          className="rounded-2xl bg-white p-5"
          style={{ border: "1px solid #E5DACA" }}
        >
          <h3 className="text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: NOHO_INK }}>
            Recent in this session
          </h3>
          <ul className="space-y-2">
            {recents.map((r, i) => (
              <li
                key={r.ts}
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors"
                style={{
                  background: i === 0 ? "rgba(22,163,74,0.06)" : "rgba(248,242,234,0.5)",
                  border: `1px solid ${i === 0 ? "rgba(22,163,74,0.18)" : "rgba(232,229,224,0.6)"}`,
                }}
              >
                <span
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: "#16A34A",
                    border: "1px solid #166534",
                    color: "white",
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12 L10 17 L19 7" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
                    {r.customerName}
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {r.suiteNumber ? `Suite #${r.suiteNumber} · ` : ""}{r.count} item{r.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-[10px] shrink-0 font-bold" style={{ color: "rgba(45,16,15,0.4)" }}>
                  {timeAgo(r.ts)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* How it works */}
      <div
        className="rounded-2xl p-4 text-xs"
        style={{
          background: "rgba(51,116,133,0.04)",
          border: "1px solid rgba(51,116,133,0.12)",
        }}
      >
        <p className="font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: NOHO_BLUE_DEEP }}>
          How it works
        </p>
        <ol className="list-decimal pl-4 space-y-1" style={{ color: "rgba(45,16,15,0.6)" }}>
          <li>Member opens their dashboard → Express Pickup → shows QR code</li>
          <li>Admin scans the QR or types the 8-character code</li>
          <li>All pending mail is instantly marked Picked Up + audited</li>
          <li>No paper slips, no signatures — token is single-customer-keyed</li>
        </ol>
      </div>

      <style jsx global>{`
        @keyframes noho-ping {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes noho-scan {
          0%, 100% { transform: translateY(-100%); opacity: 0; }
          50% { transform: translateY(100%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-md p-4 transition-colors"
      style={{
        background: accent ? NOHO_INK : "#FFFFFF",
        border: `1px solid ${accent ? NOHO_INK : "#E5DACA"}`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: accent ? "rgba(247,230,194,0.6)" : "#998877" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-bold tracking-tight mt-1"
        style={{
          color: accent ? "#F7E6C2" : NOHO_INK,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-bold mt-1" style={{ color: accent ? "rgba(255,255,255,0.6)" : NOHO_BLUE }}>
          {sub}
        </p>
      )}
    </div>
  );
}
