"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ZELLE_RECIPIENT_EMAIL } from "@/lib/pos";

const CREAM = "#F7E6C2";
const BROWN = "#2D100F";
const BLUE = "#337485";
const GOLD = "#C9A24A";
const GOLD_DARK = "#8C6E27";

type CartLine = {
  name: string;
  unitPriceCents: number;
  quantity: number;
  discountCents?: number;
};
type DisplayState = {
  cart: CartLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  method: string;
  customLabel: string;
  paymentRef: string;
  cashTenderedCents: number;
  changeDueCents: number;
  customer: {
    name: string;
    suiteNumber: string | null;
  } | null;
  zelleMemo: string;
  saleNumber: number;
  charged: number; // increments per successful charge
  theme: "brass" | "aluminum" | "walnut";
};

const INITIAL: DisplayState = {
  cart: [],
  subtotalCents: 0,
  discountCents: 0,
  taxCents: 0,
  tipCents: 0,
  totalCents: 0,
  method: "Cash",
  customLabel: "",
  paymentRef: "",
  cashTenderedCents: 0,
  changeDueCents: 0,
  customer: null,
  zelleMemo: "NOHO-00000",
  saleNumber: 0,
  charged: 0,
  theme: "brass",
};

const TAGLINES = [
  "Your Mail. Your Way.",
  "A Smarter Mailbox in NoHo.",
  "Scan it. Forward it. Forget it.",
  "Real address — never a P.O. Box.",
  "Open Mon–Sat · 9:30a–5:30p",
];

export default function DisplayClient() {
  const [state, setState] = useState<DisplayState>(INITIAL);
  const [tagIdx, setTagIdx] = useState(0);
  const lastChargedRef = useRef(0);
  const [thanksKey, setThanksKey] = useState(0);

  // Listen on BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("noho-pos");
      bc.onmessage = (e) => {
        if (e.data && typeof e.data === "object" && e.data.type === "state") {
          setState((prev) => ({ ...prev, ...e.data.payload }));
        }
      };
      // Request an initial snapshot
      bc.postMessage({ type: "request-snapshot" });
    } catch {}
    return () => { try { bc?.close(); } catch {} };
  }, []);

  // Detect charge events to fire thank-you splash
  useEffect(() => {
    if (state.charged > lastChargedRef.current) {
      lastChargedRef.current = state.charged;
      setThanksKey((k) => k + 1);
      setTimeout(() => {
        // Splash auto-clears after 4s — DisplayClient just tracks the key
      }, 4000);
    }
  }, [state.charged]);

  // Tagline rotator (idle mode)
  useEffect(() => {
    const id = window.setInterval(() => {
      setTagIdx((i) => (i + 1) % TAGLINES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const isIdle = state.cart.length === 0 && thanksKey === 0;
  const showThanks = thanksKey > 0 && (Date.now() - thanksKey < 4500);

  const themeStyles = useMemo(() => {
    switch (state.theme) {
      case "aluminum":
        return { bgFrom: "#2e3338", bgTo: "#161a1f", trim: "#888d96", glow: "#82c8ff" };
      case "walnut":
        return { bgFrom: "#5b3a25", bgTo: "#1f1107", trim: "#b88c4a", glow: "#ffc06e" };
      default:
        return { bgFrom: "#4a2a1a", bgTo: "#2a160c", trim: GOLD_DARK, glow: "#7CFFB2" };
    }
  }, [state.theme]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          `radial-gradient(ellipse at top, ${themeStyles.bgFrom} 0%, ${themeStyles.bgTo} 70%)`,
        color: CREAM,
        padding: "32px 40px",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Inter", sans-serif',
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style jsx global>{`
        @keyframes idleGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.02); }
        }
        @keyframes thanksDrop {
          0%   { transform: translateY(-30px) scale(0.85); opacity: 0; }
          50%  { transform: translateY(8px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes lineSlide {
          0%   { transform: translateX(40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/brand/logo-trans.png"
            alt="NOHO Mailbox"
            width={596}
            height={343}
            style={{ height: 56, width: "auto", filter: "brightness(1.1)" }}
            priority
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.32em", color: themeStyles.trim }}>
              ◆ Customer Display
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>
              5062 Lankershim Blvd · NoHo CA · (818) 506-7744
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: themeStyles.trim }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: state.cart.length > 0 ? "#7CFFB2" : "rgba(247,230,194,0.4)",
            boxShadow: state.cart.length > 0 ? `0 0 8px #7CFFB2` : "none",
            animation: "pulseDot 1.4s ease-in-out infinite",
          }} />
          {state.cart.length > 0 ? "Active sale" : "Awaiting next sale"}
        </div>
      </div>

      {/* Main */}
      {showThanks ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div
            key={thanksKey}
            style={{
              fontSize: "min(140px, 18vw)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              fontFamily: "Pacifico, cursive",
              color: themeStyles.trim,
              textShadow: `0 0 30px ${themeStyles.trim}66`,
              animation: "thanksDrop 700ms cubic-bezier(.34,1.56,.64,1) both",
            }}
          >
            Thank you!
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 12, opacity: 0.85 }}>
            Receipt #{String(state.saleNumber).padStart(5, "0")} · {fmt(state.totalCents)} paid
          </div>
          {state.changeDueCents > 0 && (
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 16, color: themeStyles.trim }}>
              Change due: {fmt(state.changeDueCents)}
            </div>
          )}
        </div>
      ) : isIdle ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", animation: "idleGlow 5s ease-in-out infinite" }}>
          <div style={{
            fontSize: "min(96px, 12vw)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: themeStyles.trim,
            textShadow: `0 0 30px ${themeStyles.trim}55`,
            marginBottom: 12,
          }}>
            Welcome
          </div>
          <div style={{
            fontSize: "min(48px, 5.5vw)",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            opacity: 0.85,
          }}>
            to NOHO Mailbox
          </div>
          <div
            key={tagIdx}
            style={{
              fontSize: 22,
              fontStyle: "italic",
              fontFamily: "Pacifico, cursive",
              color: themeStyles.trim,
              marginTop: 28,
              animation: "thanksDrop 700ms cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            {TAGLINES[tagIdx]}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
          {/* Left: total + method */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.65, marginBottom: 8 }}>
              ▸ Total Due
            </div>
            <div style={{
              fontSize: "min(180px, 18vw)",
              fontWeight: 900,
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: themeStyles.glow,
              textShadow: `0 0 20px ${themeStyles.glow}55`,
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmt(state.totalCents)}
            </div>

            <div style={{ marginTop: 24, padding: 20, background: "rgba(255,255,255,0.05)", border: `1px solid ${themeStyles.trim}55`, borderRadius: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", color: themeStyles.trim, marginBottom: 6 }}>
                Payment
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.01em" }}>
                {state.method === "Custom" && state.customLabel
                  ? `Custom · ${state.customLabel}`
                  : state.method === "CardOnFile" ? "Card on File" : state.method}
              </div>
              {state.method === "Zelle" && (
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85, lineHeight: 1.4 }}>
                  Send Zelle to <b style={{ color: themeStyles.trim }}>{ZELLE_RECIPIENT_EMAIL}</b>
                  <br />
                  Memo: <b style={{ color: themeStyles.trim }}>{state.zelleMemo}</b>
                </div>
              )}
              {state.method === "Cash" && state.cashTenderedCents > 0 && (
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
                  Tendered <b>{fmt(state.cashTenderedCents)}</b> · Change <b style={{ color: themeStyles.trim }}>{fmt(state.changeDueCents)}</b>
                </div>
              )}
              {state.method === "Square" && (
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
                  Insert or tap your card on the Square reader.
                </div>
              )}
              {state.method === "CardOnFile" && state.customer?.name && (
                <div style={{ marginTop: 10, fontSize: 14, opacity: 0.85 }}>
                  Charging {state.customer.name}'s card on file.
                </div>
              )}
            </div>
          </div>

          {/* Right: items */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.65, marginBottom: 8 }}>
              ▸ Items
              {state.customer && (
                <span style={{ marginLeft: 14, opacity: 0.85, fontSize: 12 }}>
                  for <b style={{ color: themeStyles.trim }}>{state.customer.name}</b>
                  {state.customer.suiteNumber ? ` · #${state.customer.suiteNumber}` : ""}
                </span>
              )}
            </div>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${themeStyles.trim}55`,
              borderRadius: 14,
              padding: 16,
              maxHeight: "62vh",
              overflowY: "auto",
            }}>
              {state.cart.slice(-7).map((line, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "8px 0",
                    borderBottom: i < Math.min(6, state.cart.length - 1) ? "1px dashed rgba(247,230,194,0.18)" : "none",
                    animation: "lineSlide 320ms cubic-bezier(.34,1.56,.64,1) both",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{line.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                      {line.quantity} × {fmt(line.unitPriceCents)}
                      {line.discountCents && line.discountCents > 0 ? ` · disc ${fmt(line.discountCents)}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(line.unitPriceCents * line.quantity - (line.discountCents ?? 0))}
                  </div>
                </div>
              ))}
              {state.cart.length > 7 && (
                <div style={{ fontSize: 12, opacity: 0.55, fontWeight: 700, marginTop: 6, textAlign: "center" }}>
                  + {state.cart.length - 7} more above
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", display: "flex", flexDirection: "column", gap: 4 }}>
              <Row k="Subtotal" v={fmt(state.subtotalCents)} />
              {state.discountCents > 0 && <Row k="Discount" v={`− ${fmt(state.discountCents)}`} />}
              {state.taxCents > 0 && <Row k="Tax" v={fmt(state.taxCents)} />}
              {state.tipCents > 0 && <Row k="Tip" v={fmt(state.tipCents)} />}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center", fontSize: 10, fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase", opacity: 0.55 }}>
        ◆ NOHO Mailbox · 5062 Lankershim · Open Mon–Sat ◆
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", opacity: 0.85 }}>
      <span>{k}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}
