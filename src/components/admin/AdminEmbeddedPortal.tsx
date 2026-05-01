"use client";

/**
 * Generic admin embed for third-party carrier portals (UPS, Stamps.com, etc).
 *
 * Most carriers set X-Frame-Options / Content-Security-Policy:
 * frame-ancestors that blocks third-party embedding. We attempt the iframe
 * but always provide a "Open in New Tab" button as the safe fallback — and
 * a "Switch to launch tile" toggle if the inline embed misbehaves.
 */
import { useState, useEffect } from "react";

type Props = {
  title: string;
  subtitle: string;
  url: string;
  quickSteps?: string[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

// Per-carrier brand kit — colors come from each carrier's livery so the embed
// chrome instantly cues which portal admin is on. Stays inside NOHO design
// system: gradients are bg-only, foreground text + chrome stays cream/ink.
type Carrier = {
  key: "ups" | "stamps" | "dhl" | "generic";
  brandFrom: string;
  brandTo: string;
  glow: string;
  emoji: string;
  shortLabel: string;
};

function detectCarrier(title: string): Carrier {
  const t = title.toLowerCase();
  if (t.includes("ups"))
    return {
      key: "ups",
      brandFrom: "#5B3A1A",
      brandTo: "#3A2308",
      glow: "rgba(255,180,0,0.35)",
      emoji: "📦",
      shortLabel: "UPS",
    };
  if (t.includes("stamps") || t.includes("stamp"))
    return {
      key: "stamps",
      brandFrom: "#003366",
      brandTo: "#001f3f",
      glow: "rgba(229,35,54,0.30)",
      emoji: "✉️",
      shortLabel: "USPS · Stamps.com",
    };
  if (t.includes("dhl"))
    return {
      key: "dhl",
      brandFrom: "#D40511",
      brandTo: "#8B0309",
      glow: "rgba(255,204,0,0.40)",
      emoji: "✈️",
      shortLabel: "DHL Express",
    };
  return {
    key: "generic",
    brandFrom: NOHO_BLUE_DEEP,
    brandTo: NOHO_INK,
    glow: "rgba(245,166,35,0.25)",
    emoji: "🌐",
    shortLabel: "Carrier portal",
  };
}

function defaultStepsFor(title: string): string[] {
  const t = title.toLowerCase();
  if (t.includes("ups")) {
    return [
      "Sign in to the REAP portal with your Access Point credentials.",
      "Scan inbound packages from UPS drivers; mark held items for customer pickup.",
      "Process customer pickups by scanning their tracking + getting a signature.",
    ];
  }
  if (t.includes("stamps")) {
    return [
      "Top up your Stamps.com balance before printing high-volume USPS labels.",
      "For one-off USPS labels, prefer Quick Ship — Shippo gives you the same rates with our +10% margin auto-applied.",
      "Use this portal for SCAN forms, end-of-day USPS reconciliation, and PS Form 1583 archives.",
    ];
  }
  if (t.includes("dhl")) {
    return [
      "Schedule a DHL pickup for outbound international shipments here.",
      "For label creation, prefer Quick Ship — DHL Express rates flow through Shippo with markup auto-applied.",
      "Use this portal for customs paperwork, duties pre-payment, and pickup management.",
    ];
  }
  return [];
}

function helpfulLinksFor(carrier: Carrier["key"]): Array<{ label: string; href: string; sub: string }> {
  if (carrier === "ups")
    return [
      { label: "REAP Operator Guide", href: "https://www.theupsstore.com/about/locator", sub: "Access Point procedures" },
      { label: "UPS Customer Center", href: "https://www.ups.com/", sub: "Track + manage shipments" },
      { label: "Schedule Pickup", href: "https://www.ups.com/pickup/", sub: "Daily pickup window" },
    ];
  if (carrier === "stamps")
    return [
      { label: "USPS Form 1583", href: "https://about.usps.com/forms/ps1583.pdf", sub: "CMRA notarized form" },
      { label: "Stamps.com Help", href: "https://www.stamps.com/support/", sub: "Account + billing" },
      { label: "USPS Service Alerts", href: "https://about.usps.com/newsroom/service-alerts/", sub: "Delivery delays" },
    ];
  if (carrier === "dhl")
    return [
      { label: "DHL Customs Toolkit", href: "https://mydhli.com/", sub: "Duties + paperwork" },
      { label: "DHL Express Help", href: "https://www.dhl.com/us-en/home/customer-service.html", sub: "Account + tracking" },
      { label: "Restricted Items", href: "https://mydhli.com/global-en/home/customs/restricted-items.html", sub: "Country-specific rules" },
    ];
  return [];
}

export function AdminEmbeddedPortal({ title, subtitle, url, quickSteps }: Props) {
  const [view, setView] = useState<"embed" | "popout">("embed");
  const [frameError, setFrameError] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const steps = quickSteps ?? defaultStepsFor(title);
  const carrier = detectCarrier(title);
  const links = helpfulLinksFor(carrier.key);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-5">
      {/* Branded hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${carrier.brandFrom} 0%, ${carrier.brandTo} 100%)`,
          boxShadow: `0 8px 28px ${carrier.glow}`,
        }}
      >
        {/* Pattern decoration */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1.2px, transparent 1.2px), radial-gradient(circle at 75% 70%, white 1px, transparent 1px)",
            backgroundSize: "36px 36px, 24px 24px",
          }}
        />
        {/* Carrier glyph corner */}
        <div className="absolute right-6 top-6 opacity-20 pointer-events-none text-[68px] leading-none">
          {carrier.emoji}
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: NOHO_AMBER }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              {carrier.shortLabel} · External portal
            </span>
          </div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontFamily: "var(--font-baloo, system-ui)",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }}
          >
            {title}
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            {subtitle}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-105"
              style={{
                background: NOHO_CREAM,
                color: NOHO_INK,
                boxShadow: `0 4px 14px ${NOHO_CREAM}66`,
              }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 4h6v6 M21 3l-9 9 M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Open in New Tab
            </a>
            {!frameError && (
              <div
                className="inline-flex items-center gap-1 rounded-xl p-1"
                style={{ background: `${NOHO_CREAM}1a` }}
              >
                {(["embed", "popout"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: view === v ? "white" : "transparent",
                      color: view === v ? NOHO_INK : NOHO_CREAM,
                    }}
                  >
                    {v === "embed" ? "Inline" : "Launch tile"}
                  </button>
                ))}
              </div>
            )}
            <span
              className="ml-auto text-[10px] font-bold inline-flex items-center gap-1.5"
              style={{ color: `${NOHO_CREAM}aa` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: NOHO_GREEN }} />
              {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Embed-block notice */}
      <div
        className="rounded-xl px-4 py-3 text-[12px] font-semibold flex items-start gap-2.5"
        style={{
          background: `${NOHO_AMBER}15`,
          border: `1px solid ${NOHO_AMBER}33`,
          color: "#92400e",
        }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5 M12 16h.01" strokeLinecap="round" />
        </svg>
        <span>
          Some carriers block third-party embedding. If the portal stays blank or shows a sign-in error,
          use <strong>Open in New Tab</strong> — the session will persist for your next visit.
        </span>
      </div>

      {/* Quick guide + Helpful links — 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {steps.length > 0 && (
          <div
            className="rounded-2xl p-4 bg-white lg:col-span-2"
            style={{
              border: `1px solid ${NOHO_INK}11`,
              boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${carrier.brandFrom}15` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={carrier.brandFrom} strokeWidth="2.5">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <span
                className="text-[11px] font-black uppercase tracking-[0.15em]"
                style={{ color: NOHO_INK }}
              >
                What to do here
              </span>
            </div>
            <ol className="space-y-2 list-none pl-0">
              {steps.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[12px] leading-relaxed"
                  style={{ color: `${NOHO_INK}cc` }}
                >
                  <span
                    className="shrink-0 w-6 h-6 rounded-lg inline-flex items-center justify-center text-[10px] font-black mt-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${carrier.brandFrom} 0%, ${carrier.brandTo} 100%)`,
                      color: "white",
                      boxShadow: `0 2px 6px ${carrier.glow}`,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {links.length > 0 && (
          <div
            className="rounded-2xl p-4 bg-white"
            style={{
              border: `1px solid ${NOHO_INK}11`,
              boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${NOHO_BLUE}15` }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NOHO_BLUE} strokeWidth="2.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <span
                className="text-[11px] font-black uppercase tracking-[0.15em]"
                style={{ color: NOHO_INK }}
              >
                Helpful Links
              </span>
            </div>
            <ul className="space-y-1.5">
              {links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg p-2 transition-all hover:bg-[#F7E6C2]/40 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] font-black truncate"
                        style={{ color: NOHO_INK }}
                      >
                        {l.label}
                      </span>
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={`${NOHO_INK}77`}
                        strokeWidth="2"
                        className="shrink-0 group-hover:translate-x-0.5 transition-transform"
                      >
                        <path d="M7 17l9.2-9.2 M17 17V7H7" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="text-[10px]" style={{ color: `${NOHO_INK}66` }}>
                      {l.sub}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Embed or launch tile */}
      {view === "embed" && !frameError ? (
        <div
          className="rounded-2xl bg-white overflow-hidden relative"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            boxShadow: "0 1px 0 rgba(51,116,133,0.04), 0 4px 12px rgba(45,16,15,0.05)",
            height: "calc(100vh - 380px)",
            minHeight: 480,
          }}
        >
          {/* Embed window chrome */}
          <div
            className="absolute top-0 left-0 right-0 h-7 z-10 flex items-center gap-1.5 px-3 backdrop-blur-md"
            style={{
              background: `${NOHO_CREAM}cc`,
              borderBottom: `1px solid ${NOHO_INK}11`,
            }}
          >
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NOHO_RED }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NOHO_AMBER }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NOHO_GREEN }} />
            </div>
            <div
              className="flex-1 mx-2 px-2 py-0.5 rounded-md text-[10px] font-mono truncate text-center"
              style={{
                background: `${NOHO_INK}08`,
                color: `${NOHO_INK}88`,
              }}
            >
              {url}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black"
              style={{ color: NOHO_BLUE }}
              title="Pop out"
            >
              ↗
            </a>
          </div>

          <iframe
            src={url}
            title={title}
            className="w-full h-full pt-7"
            style={{ border: 0 }}
            referrerPolicy="no-referrer"
            onError={() => setFrameError(true)}
          />
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          {/* Decorative carrier-color accent */}
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${carrier.brandFrom} 0%, transparent 70%)`,
            }}
          />

          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 relative"
            style={{
              background: `linear-gradient(135deg, ${carrier.brandFrom} 0%, ${carrier.brandTo} 100%)`,
              boxShadow: `0 12px 32px ${carrier.glow}`,
            }}
          >
            <span className="text-[40px] leading-none">{carrier.emoji}</span>
          </div>
          <h3
            className="font-black text-xl mb-2"
            style={{
              color: NOHO_INK,
              fontFamily: "var(--font-baloo, system-ui)",
            }}
          >
            {title}
          </h3>
          <p className="text-[13px] mb-6 max-w-md mx-auto" style={{ color: `${NOHO_INK}88` }}>
            {subtitle}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${carrier.brandFrom} 0%, ${carrier.brandTo} 100%)`,
              boxShadow: `0 6px 24px ${carrier.glow}`,
            }}
          >
            Open Portal
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14 M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <p
            className="text-[10px] mt-4 break-all font-mono px-4 py-2 rounded-lg inline-block"
            style={{ background: `${NOHO_INK}06`, color: `${NOHO_INK}55` }}
          >
            {url}
          </p>
        </div>
      )}
    </div>
  );
}
