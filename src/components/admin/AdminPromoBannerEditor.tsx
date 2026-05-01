"use client";

import { useEffect, useState, useTransition } from "react";
import { getPromoBanner, updatePromoBanner } from "@/app/actions/promo-banner";
import {
  DEFAULT_PROMO_BANNER,
  renderPromoMessage,
  isPromoBannerActive,
  type PromoBannerConfig,
} from "@/lib/promo-banner-config";

const PRESETS: { name: string; config: Partial<PromoBannerConfig> }[] = [
  {
    name: "Mother's Day — Florists",
    config: {
      audience: "Florists",
      message:
        "{daysLeft} days to Mother's Day — reserve overflow drivers now. $5/stop in NoHo, $9.75–$14 across the Valley.",
      ctaText: "Reserve",
      ctaHref: "/delivery/for-florists",
      iconEmoji: "🌹",
      bgFrom: "#B07030",
      bgTo: "#8A5520",
      textColor: "#FFE4A0",
    },
  },
  {
    name: "Valentine's — Florists",
    config: {
      audience: "Florists",
      message:
        "{daysLeft} days to Valentine's Day — reserve overflow drivers. $5/stop in NoHo, $9.75–$14 across the Valley.",
      ctaText: "Reserve",
      ctaHref: "/delivery/for-florists",
      iconEmoji: "🌹",
      bgFrom: "#A0274A",
      bgTo: "#751E37",
      textColor: "#FFE4A0",
    },
  },
  {
    name: "Restaurants — Lunch Rush",
    config: {
      audience: "Restaurants",
      message:
        "Slammed at lunch? Same-day couriers, $5/stop in NoHo. We dispatch within 15 minutes — no contract.",
      ctaText: "Get a courier",
      ctaHref: "/delivery",
      iconEmoji: "🍽️",
      bgFrom: "#337485",
      bgTo: "#23596A",
      textColor: "#F7E6C2",
      countdownDate: "",
    },
  },
  {
    name: "Generic — Same-Day",
    config: {
      audience: "",
      message: "Same-day delivery in North Hollywood from $5/stop. Book online — no contract, no minimum.",
      ctaText: "Book delivery",
      ctaHref: "/delivery",
      iconEmoji: "",
      bgFrom: "#2D100F",
      bgTo: "#1F0807",
      textColor: "#F7E6C2",
      countdownDate: "",
    },
  },
];

const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const BORDER = "#E8DDD0";
const CREAM = "#F7E6C2";
const BLUE = "#337485";
const BLUE_DEEP = "#23596A";

function fieldLabel(text: string) {
  return (
    <p
      className="text-[11px] font-black uppercase tracking-[0.16em] mb-1.5"
      style={{ color: INK_SOFT }}
    >
      {text}
    </p>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: "white",
    border: `1px solid ${BORDER}`,
    color: INK,
  };
}

export default function AdminPromoBannerEditor() {
  const [cfg, setCfg] = useState<PromoBannerConfig | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    getPromoBanner().then(setCfg);
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function update<K extends keyof PromoBannerConfig>(
    key: K,
    value: PromoBannerConfig[K],
  ) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function applyPreset(preset: Partial<PromoBannerConfig>) {
    setCfg((prev) =>
      prev
        ? { ...prev, ...preset }
        : { ...DEFAULT_PROMO_BANNER, ...preset },
    );
    setMsg("Preset applied — review and Save to publish.");
  }

  function save() {
    if (!cfg) return;
    startTransition(async () => {
      const res = await updatePromoBanner(cfg);
      if ("error" in res && res.error) {
        setMsg(res.error);
      } else {
        setMsg("✓ Saved — visible to customers on next page load.");
      }
    });
  }

  function reset() {
    setCfg({ ...DEFAULT_PROMO_BANNER });
    setMsg("Reverted to defaults — Save to publish.");
  }

  if (!cfg) {
    return (
      <div
        className="rounded-3xl p-6"
        style={{ background: "white", border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm" style={{ color: INK_SOFT }}>
          Loading promo banner config…
        </p>
      </div>
    );
  }

  const isActive = isPromoBannerActive(cfg, now);
  const previewMessage = renderPromoMessage(cfg, now);

  return (
    <div
      className="rounded-3xl p-6 space-y-5"
      style={{
        background: "white",
        border: `1px solid ${BORDER}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3
            className="font-black text-sm uppercase tracking-[0.16em]"
            style={{ color: INK }}
          >
            Promo Banner
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: INK_SOFT }}>
            Top-of-page bar shown across all marketing pages — &quot;the florists bar.&quot;
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.10em]"
            style={
              isActive
                ? { background: "var(--color-success-soft)", color: "#166534" }
                : { background: "rgba(45,16,15,0.06)", color: INK_SOFT }
            }
          >
            {isActive ? "Live" : "Hidden"}
          </span>
          <label
            className="flex items-center gap-2 text-[12px] font-bold cursor-pointer select-none"
            style={{ color: INK }}
          >
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
              className="w-4 h-4 accent-[#2D100F]"
            />
            Enabled
          </label>
        </div>
      </div>

      {/* Live preview */}
      <div>
        {fieldLabel("Live preview")}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {cfg.enabled ? (
            <div
              className="relative w-full px-4 py-3 text-center text-sm font-semibold flex items-center justify-center gap-3"
              style={{
                background: `linear-gradient(90deg, ${cfg.bgFrom} 0%, ${cfg.bgTo} 100%)`,
                color: cfg.textColor,
              }}
            >
              {cfg.iconEmoji && (
                <span className="hidden sm:inline" aria-hidden>
                  {cfg.iconEmoji}
                </span>
              )}
              <span>
                {cfg.audience && (
                  <strong className="font-extrabold mr-2" style={{ color: "#FFFFFF" }}>
                    {cfg.audience}:
                  </strong>
                )}
                {previewMessage}
                {cfg.ctaText && cfg.ctaHref && (
                  <>
                    {" "}
                    <span className="underline font-bold" style={{ color: "#FFFFFF" }}>
                      {cfg.ctaText} →
                    </span>
                  </>
                )}
              </span>
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ color: cfg.textColor }}
              >
                ×
              </span>
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-[12px]" style={{ color: INK_SOFT }}>
              Banner is disabled — toggle &quot;Enabled&quot; to preview.
            </p>
          )}
        </div>
      </div>

      {/* Preset chips */}
      <div>
        {fieldLabel("Quick presets")}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p.config)}
              className="text-[11px] font-black uppercase tracking-[0.06em] px-3 h-8 rounded-full transition-transform hover:-translate-y-0.5"
              style={{
                background: CREAM,
                color: INK,
                border: `1px solid ${BORDER}`,
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Copy fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {fieldLabel("Audience tag (e.g. \"Florists\")")}
          <input
            type="text"
            value={cfg.audience}
            onChange={(e) => update("audience", e.target.value)}
            placeholder="Florists"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
        </div>
        <div>
          {fieldLabel("Icon emoji (optional)")}
          <input
            type="text"
            value={cfg.iconEmoji}
            onChange={(e) => update("iconEmoji", e.target.value)}
            placeholder="🌹"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
        </div>
      </div>

      <div>
        {fieldLabel("Message — use {daysLeft} for the countdown")}
        <textarea
          value={cfg.message}
          onChange={(e) => update("message", e.target.value)}
          rows={3}
          className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
          style={inputStyle()}
        />
        <p className="text-[11px] mt-1" style={{ color: INK_SOFT }}>
          Tip: <code>{"{daysLeft}"}</code> auto-fills with the days remaining until the
          countdown date below. Leave it out for evergreen promos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {fieldLabel("CTA text (empty = no link)")}
          <input
            type="text"
            value={cfg.ctaText}
            onChange={(e) => update("ctaText", e.target.value)}
            placeholder="Reserve"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
        </div>
        <div>
          {fieldLabel("CTA link")}
          <input
            type="text"
            value={cfg.ctaHref}
            onChange={(e) => update("ctaHref", e.target.value)}
            placeholder="/delivery/for-florists"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {fieldLabel("Countdown date (empty = no countdown)")}
          <input
            type="datetime-local"
            value={cfg.countdownDate ? toLocalInput(cfg.countdownDate) : ""}
            onChange={(e) => update("countdownDate", fromLocalInput(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
          <p className="text-[11px] mt-1" style={{ color: INK_SOFT }}>
            Used to compute <code>{"{daysLeft}"}</code> in the message.
          </p>
        </div>
        <div>
          {fieldLabel("Hide after (empty = never auto-hide)")}
          <input
            type="datetime-local"
            value={cfg.hideAfter ? toLocalInput(cfg.hideAfter) : ""}
            onChange={(e) => update("hideAfter", fromLocalInput(e.target.value))}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D100F]/30"
            style={inputStyle()}
          />
          <p className="text-[11px] mt-1" style={{ color: INK_SOFT }}>
            Banner auto-disappears after this moment, even if Enabled.
          </p>
        </div>
      </div>

      {/* Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          {fieldLabel("Gradient — start")}
          <ColorInput value={cfg.bgFrom} onChange={(v) => update("bgFrom", v)} />
        </div>
        <div>
          {fieldLabel("Gradient — end")}
          <ColorInput value={cfg.bgTo} onChange={(v) => update("bgTo", v)} />
        </div>
        <div>
          {fieldLabel("Text color")}
          <ColorInput value={cfg.textColor} onChange={(v) => update("textColor", v)} />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="text-[12px] font-bold underline"
          style={{ color: INK_SOFT }}
        >
          Reset to defaults
        </button>
        <div className="flex items-center gap-3">
          {msg && (
            <span className="text-[12px] font-bold" style={{ color: msg.startsWith("✓") ? "#166534" : INK }}>
              {msg}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`,
              color: "white",
              boxShadow: "0 6px 20px rgba(51,116,133,0.32)",
            }}
          >
            {pending ? "Saving…" : "Save & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-2 py-1.5"
      style={{ background: "white", border: `1px solid ${BORDER}` }}
    >
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md cursor-pointer"
        style={{ border: "none", background: "transparent" }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm font-mono focus:outline-none"
        style={{ color: INK, background: "transparent" }}
      />
    </div>
  );
}

// HTML <input type="datetime-local"> wants a value like "2026-05-12T00:00",
// without timezone. We persist full ISO strings (with offset) to keep timezone
// intent clear. These helpers translate both directions in local time.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}
