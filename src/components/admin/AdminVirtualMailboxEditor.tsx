"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getVirtualMailbox,
  updateVirtualMailbox,
} from "@/app/actions/virtual-mailbox";
import {
  DEFAULT_VIRTUAL_MAILBOX,
  type VirtualMailboxConfig,
  type VirtualMailboxPlan,
} from "@/lib/virtual-mailbox-config";

const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
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

const inputBase: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BORDER}`,
  color: INK,
};

type TabKey = "overview" | "plans" | "benefits" | "faqs";

export default function AdminVirtualMailboxEditor() {
  const [cfg, setCfg] = useState<VirtualMailboxConfig | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("plans");

  useEffect(() => {
    getVirtualMailbox().then(setCfg);
  }, []);

  function update<K extends keyof VirtualMailboxConfig>(
    key: K,
    value: VirtualMailboxConfig[K],
  ) {
    setCfg((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updatePlan(idx: number, patch: Partial<VirtualMailboxPlan>) {
    setCfg((prev) => {
      if (!prev) return prev;
      const plans = prev.plans.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, plans };
    });
  }

  function addPlan() {
    setCfg((prev) => {
      if (!prev) return prev;
      const newPlan: VirtualMailboxPlan = {
        id: "new-plan-" + Date.now(),
        name: "New plan",
        monthly: 0,
        annual: 0,
        recipients: 1,
        itemsPerMonth: 0,
        freeScans: 0,
        features: [],
        cta: "Choose",
      };
      return { ...prev, plans: [...prev.plans, newPlan] };
    });
  }

  function removePlan(idx: number) {
    setCfg((prev) => {
      if (!prev) return prev;
      if (prev.plans.length <= 1) return prev;
      return { ...prev, plans: prev.plans.filter((_, i) => i !== idx) };
    });
  }

  function movePlan(idx: number, dir: -1 | 1) {
    setCfg((prev) => {
      if (!prev) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.plans.length) return prev;
      const plans = [...prev.plans];
      [plans[idx], plans[target]] = [plans[target], plans[idx]];
      return { ...prev, plans };
    });
  }

  function save() {
    if (!cfg) return;
    startTransition(async () => {
      const res = await updateVirtualMailbox(cfg);
      if ("error" in res && res.error) {
        setMsg(res.error);
      } else {
        setMsg("✓ Saved — visible on /virtual-mailbox immediately.");
      }
    });
  }

  function reset() {
    setCfg({ ...DEFAULT_VIRTUAL_MAILBOX });
    setMsg("Reverted to defaults — Save to publish.");
  }

  if (!cfg) {
    return (
      <div
        className="rounded-3xl p-6"
        style={{ background: "white", border: `1px solid ${BORDER}` }}
      >
        <p className="text-sm" style={{ color: INK_SOFT }}>
          Loading virtual mailbox config…
        </p>
      </div>
    );
  }

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
            Virtual Mailbox
          </h3>
          <p className="text-[12px] mt-0.5" style={{ color: INK_SOFT }}>
            Pricing + copy for the digital-only tier (iPostal-style). Lives at <code>/virtual-mailbox</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.10em]"
            style={
              cfg.enabled
                ? { background: "var(--color-success-soft)", color: "#166534" }
                : { background: "rgba(45,16,15,0.06)", color: INK_SOFT }
            }
          >
            {cfg.enabled ? "Live" : "Hidden"}
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

      {/* Tabs */}
      <div
        className="inline-flex items-center rounded-full p-1"
        style={{ background: CREAM, border: `1px solid ${BORDER}` }}
      >
        {(["plans", "overview", "benefits", "faqs"] as TabKey[]).map((t) => {
          const active = tab === t;
          const label =
            t === "overview" ? "Hero copy" : t === "plans" ? "Plans" : t === "benefits" ? "Benefits" : "FAQs";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="text-[11px] font-black uppercase tracking-[0.06em] px-3 h-8 rounded-full"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`
                  : "transparent",
                color: active ? CREAM : INK,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* PLANS */}
      {tab === "plans" && (
        <div className="space-y-4">
          {cfg.plans.map((p, idx) => (
            <div
              key={p.id + idx}
              className="rounded-2xl p-4"
              style={{ background: "#F8F2EA", border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded-full"
                    style={{ background: BLUE, color: "white" }}
                  >
                    Plan {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePlan(idx, { name: e.target.value })}
                    placeholder="Plan name"
                    className="text-[15px] font-black bg-transparent border-0 focus:outline-none"
                    style={{ color: INK }}
                  />
                  <label className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-bold" style={{ color: INK_SOFT }}>
                    <input
                      type="checkbox"
                      checked={!!p.popular}
                      onChange={(e) => updatePlan(idx, { popular: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[#2D100F]"
                    />
                    Popular
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => movePlan(idx, -1)} disabled={idx === 0} className="text-xs font-black px-2 h-7 rounded-md disabled:opacity-30" style={{ background: "white", border: `1px solid ${BORDER}`, color: INK }}>↑</button>
                  <button type="button" onClick={() => movePlan(idx, 1)} disabled={idx === cfg.plans.length - 1} className="text-xs font-black px-2 h-7 rounded-md disabled:opacity-30" style={{ background: "white", border: `1px solid ${BORDER}`, color: INK }}>↓</button>
                  <button type="button" onClick={() => removePlan(idx)} disabled={cfg.plans.length <= 1} className="text-xs font-black px-2 h-7 rounded-md disabled:opacity-30" style={{ background: "white", border: "1px solid rgba(239,68,68,0.30)", color: "var(--color-danger)" }}>✕</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  {fieldLabel("Plan id")}
                  <input type="text" value={p.id} onChange={(e) => updatePlan(idx, { id: e.target.value })} className="w-full rounded-lg px-2 py-1.5 text-sm font-mono" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("Badge (optional)")}
                  <input type="text" value={p.badge ?? ""} onChange={(e) => updatePlan(idx, { badge: e.target.value })} placeholder="Most Popular" className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("Monthly $")}
                  <input type="number" step="0.01" min={0} value={p.monthly} onChange={(e) => updatePlan(idx, { monthly: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("Annual $ (total/yr)")}
                  <input type="number" step="0.01" min={0} value={p.annual} onChange={(e) => updatePlan(idx, { annual: Number(e.target.value) })} className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  {fieldLabel("Recipients")}
                  <input type="number" min={1} value={p.recipients} onChange={(e) => updatePlan(idx, { recipients: Math.max(1, Number(e.target.value)) })} className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("Items / mo (0 = unlimited)")}
                  <input type="number" min={0} value={p.itemsPerMonth} onChange={(e) => updatePlan(idx, { itemsPerMonth: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("Free scans / mo")}
                  <input type="number" min={0} value={p.freeScans} onChange={(e) => updatePlan(idx, { freeScans: Math.max(0, Number(e.target.value)) })} className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
                <div>
                  {fieldLabel("CTA copy")}
                  <input type="text" value={p.cta} onChange={(e) => updatePlan(idx, { cta: e.target.value })} placeholder="Choose" className="w-full rounded-lg px-2 py-1.5 text-sm" style={inputBase} />
                </div>
              </div>

              <div>
                {fieldLabel("Features (one per line)")}
                <textarea
                  value={p.features.join("\n")}
                  onChange={(e) =>
                    updatePlan(idx, {
                      features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  rows={4}
                  className="w-full rounded-lg px-2 py-1.5 text-sm font-mono"
                  style={inputBase}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPlan}
            className="w-full rounded-2xl py-3 text-[12px] font-black uppercase tracking-[0.06em]"
            style={{
              background: "transparent",
              color: INK,
              border: `2px dashed ${BORDER}`,
            }}
          >
            + Add plan
          </button>
        </div>
      )}

      {/* OVERVIEW (hero copy) */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div>
            {fieldLabel("Hero headline")}
            <input
              type="text"
              value={cfg.headline}
              onChange={(e) => update("headline", e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={inputBase}
            />
          </div>
          <div>
            {fieldLabel("Hero subhead")}
            <textarea
              value={cfg.subhead}
              onChange={(e) => update("subhead", e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm"
              style={inputBase}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {fieldLabel("Address chip label")}
              <input
                type="text"
                value={cfg.digitalAddressLabel}
                onChange={(e) => update("digitalAddressLabel", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputBase}
              />
            </div>
            <div>
              {fieldLabel("Address line")}
              <input
                type="text"
                value={cfg.digitalAddressLine}
                onChange={(e) => update("digitalAddressLine", e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm"
                style={inputBase}
              />
            </div>
          </div>
        </div>
      )}

      {/* BENEFITS */}
      {tab === "benefits" && (
        <div className="space-y-3">
          {cfg.benefits.map((b, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4"
              style={{ background: "#F8F2EA", border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BLUE }}>
                  Benefit {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "benefits",
                      cfg.benefits.filter((_, i) => i !== idx),
                    )
                  }
                  className="text-xs font-black px-2 h-7 rounded-md"
                  style={{ background: "white", border: "1px solid rgba(239,68,68,0.30)", color: "var(--color-danger)" }}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={b.title}
                placeholder="Title"
                onChange={(e) => {
                  const next = [...cfg.benefits];
                  next[idx] = { ...b, title: e.target.value };
                  update("benefits", next);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-sm font-bold mb-2"
                style={inputBase}
              />
              <textarea
                value={b.body}
                placeholder="Body"
                onChange={(e) => {
                  const next = [...cfg.benefits];
                  next[idx] = { ...b, body: e.target.value };
                  update("benefits", next);
                }}
                rows={3}
                className="w-full rounded-lg px-2 py-1.5 text-sm"
                style={inputBase}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("benefits", [...cfg.benefits, { title: "New benefit", body: "" }])}
            className="w-full rounded-2xl py-3 text-[12px] font-black uppercase tracking-[0.06em]"
            style={{ background: "transparent", color: INK, border: `2px dashed ${BORDER}` }}
          >
            + Add benefit
          </button>
        </div>
      )}

      {/* FAQS */}
      {tab === "faqs" && (
        <div className="space-y-3">
          {cfg.faqs.map((f, idx) => (
            <div
              key={idx}
              className="rounded-2xl p-4"
              style={{ background: "#F8F2EA", border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BLUE }}>
                  FAQ {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => update("faqs", cfg.faqs.filter((_, i) => i !== idx))}
                  className="text-xs font-black px-2 h-7 rounded-md"
                  style={{ background: "white", border: "1px solid rgba(239,68,68,0.30)", color: "var(--color-danger)" }}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={f.question}
                placeholder="Question"
                onChange={(e) => {
                  const next = [...cfg.faqs];
                  next[idx] = { ...f, question: e.target.value };
                  update("faqs", next);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-sm font-bold mb-2"
                style={inputBase}
              />
              <textarea
                value={f.answer}
                placeholder="Answer"
                onChange={(e) => {
                  const next = [...cfg.faqs];
                  next[idx] = { ...f, answer: e.target.value };
                  update("faqs", next);
                }}
                rows={3}
                className="w-full rounded-lg px-2 py-1.5 text-sm"
                style={inputBase}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("faqs", [...cfg.faqs, { question: "New question", answer: "" }])}
            className="w-full rounded-2xl py-3 text-[12px] font-black uppercase tracking-[0.06em]"
            style={{ background: "transparent", color: INK, border: `2px dashed ${BORDER}` }}
          >
            + Add FAQ
          </button>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <button type="button" onClick={reset} className="text-[12px] font-bold underline" style={{ color: INK_SOFT }}>
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

      <p className="text-[11px]" style={{ color: INK_FAINT }}>
        Tip: <code>Item count = 0</code> means unlimited. Annual = 0 hides the
        annual toggle.
      </p>
    </div>
  );
}
