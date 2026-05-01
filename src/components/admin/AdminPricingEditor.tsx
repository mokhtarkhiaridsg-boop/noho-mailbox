"use client";

/**
 * Admin editor for the public /pricing page.
 * Edits four sections: Plans, Comparison rows, Fees, Policies.
 * One save round-trip persists everything to SiteConfig.
 */
import { useEffect, useState, useTransition } from "react";
import { getPricingConfig, updatePricingConfig } from "@/app/actions/pricing";
import type {
  PricingConfig,
  PricingPlan,
  ComparisonRow,
  FeeRow,
  PolicyItem,
} from "@/lib/pricing-config";

type TabId = "plans" | "comparison" | "fees" | "policies" | "header";

const tabs: { id: TabId; label: string }[] = [
  { id: "header", label: "Header" },
  { id: "plans", label: "Plans" },
  { id: "comparison", label: "Comparison" },
  { id: "fees", label: "Fees" },
  { id: "policies", label: "Policies" },
];

export function AdminPricingEditor() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [tab, setTab] = useState<TabId>("plans");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getPricingConfig().then(setConfig);
  }, []);

  function patch<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  function save() {
    if (!config) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updatePricingConfig(config);
      if ("error" in res && res.error) setMsg(res.error);
      else setMsg("✓ Pricing page updated");
    });
  }

  if (!config) {
    return (
      <div
        className="rounded-2xl bg-white p-6"
        style={{
          border: "1px solid rgba(45,16,15,0.1)",
          boxShadow: "0 1px 0 rgba(51,116,133,0.04), 0 4px 12px rgba(45,16,15,0.05)",
        }}
      >
        <p className="text-sm" style={{ color: "rgba(45,16,15,0.5)" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-white space-y-5 p-6"
      style={{
        border: "1px solid rgba(45,16,15,0.1)",
        boxShadow: "0 1px 0 rgba(51,116,133,0.04), 0 4px 12px rgba(45,16,15,0.05)",
      }}
    >
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h3
            className="font-black text-base"
            style={{ color: "#2D100F", fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Pricing Page Editor
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            Live-edit every section of <code style={{ color: "#337485" }}>/pricing</code>: plans, comparison table, fee schedule, policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                msg.startsWith("✓")
                  ? "text-green-700 bg-green-50"
                  : "text-red-700 bg-red-50"
              }`}
            >
              {msg}
            </span>
          )}
          <a
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-bold border-2 hover:bg-[#337485]/10 transition-colors"
            style={{ borderColor: "#337485", color: "#337485" }}
          >
            Preview /pricing
          </a>
          <button
            onClick={save}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50"
            style={{ background: "#337485" }}
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-black transition-colors"
            style={{
              background: tab === t.id ? "#2D100F" : "rgba(45,16,15,0.06)",
              color: tab === t.id ? "#F7E6C2" : "#2D100F",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      {tab === "header" && (
        <div className="space-y-3 max-w-2xl">
          <Field label="Headline">
            <input
              className={inputCls}
              value={config.headline}
              onChange={(e) => patch("headline", e.target.value)}
            />
          </Field>
          <Field label="Subhead">
            <textarea
              rows={2}
              className={inputCls}
              value={config.subhead}
              onChange={(e) => patch("subhead", e.target.value)}
            />
          </Field>
        </div>
      )}

      {tab === "plans" && (
        <PlansEditor
          plans={config.plans}
          onChange={(plans) => patch("plans", plans)}
        />
      )}

      {tab === "comparison" && (
        <ComparisonEditor
          plans={config.plans}
          rows={config.comparison}
          onChange={(comparison) => patch("comparison", comparison)}
        />
      )}

      {tab === "fees" && (
        <FeesEditor
          fees={config.fees}
          onChange={(fees) => patch("fees", fees)}
        />
      )}

      {tab === "policies" && (
        <PoliciesEditor
          policies={config.policies}
          onChange={(policies) => patch("policies", policies)}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485] bg-white";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className="block text-[10px] font-bold uppercase tracking-wider mb-1"
        style={{ color: "rgba(45,16,15,0.45)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function MoveButtons({
  onUp,
  onDown,
  onDel,
}: {
  onUp: () => void;
  onDown: () => void;
  onDel: () => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onUp}
        className="w-7 h-7 rounded-md text-[12px] font-bold hover:bg-[#337485]/10"
        style={{ color: "#337485" }}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onDown}
        className="w-7 h-7 rounded-md text-[12px] font-bold hover:bg-[#337485]/10"
        style={{ color: "#337485" }}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onDel}
        className="w-7 h-7 rounded-md text-[12px] font-bold hover:bg-red-50 text-red-600"
        aria-label="Delete"
      >
        ✕
      </button>
    </div>
  );
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

// ─────────────────────── Plans editor ────────────────────────
function PlansEditor({
  plans,
  onChange,
}: {
  plans: PricingPlan[];
  onChange: (p: PricingPlan[]) => void;
}) {
  function set(idx: number, patch: Partial<PricingPlan>) {
    onChange(plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function remove(idx: number) {
    onChange(plans.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...plans,
      {
        id: `plan-${Date.now()}`,
        name: "New Plan",
        prices: { term3: 0, term6: 0, term14: 0 },
        keyFee: 15,
        features: [],
        cta: "Get Started",
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Each plan card on /pricing comes from this list. Use the popular flag to highlight the recommended plan.
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10"
          style={{ borderColor: "#337485", color: "#337485" }}
        >
          + Add plan
        </button>
      </div>

      {plans.map((p, i) => (
        <div
          key={p.id + "-" + i}
          className="rounded-xl p-4 space-y-3"
          style={{ background: "#FAFAF8", border: "1px solid rgba(45,16,15,0.08)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.45)" }}>
              Plan #{i + 1}
            </p>
            <MoveButtons
              onUp={() => onChange(move(plans, i, -1))}
              onDown={() => onChange(move(plans, i, 1))}
              onDel={() => remove(i)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ID (lowercase, no spaces)">
              <input className={inputCls} value={p.id} onChange={(e) => set(i, { id: e.target.value })} placeholder="basic" />
            </Field>
            <Field label="Display name">
              <input className={inputCls} value={p.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Basic Box" />
            </Field>
            <Field label="Badge (small label)">
              <input className={inputCls} value={p.badge ?? ""} onChange={(e) => set(i, { badge: e.target.value })} placeholder="Most Popular" />
            </Field>
            <Field label="CTA button label">
              <input className={inputCls} value={p.cta} onChange={(e) => set(i, { cta: e.target.value })} placeholder="Choose Basic" />
            </Field>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: "#2D100F" }}>
            <input type="checkbox" checked={!!p.popular} onChange={(e) => set(i, { popular: e.target.checked })} />
            Mark as Most Popular (highlighted card)
          </label>

          <div className="grid grid-cols-4 gap-3">
            <Field label="3 mo (USD)">
              <input type="number" className={inputCls} value={p.prices.term3} onChange={(e) => set(i, { prices: { ...p.prices, term3: parseInt(e.target.value || "0") } })} />
            </Field>
            <Field label="6 mo (USD)">
              <input type="number" className={inputCls} value={p.prices.term6} onChange={(e) => set(i, { prices: { ...p.prices, term6: parseInt(e.target.value || "0") } })} />
            </Field>
            <Field label="14 mo (USD)">
              <input type="number" className={inputCls} value={p.prices.term14} onChange={(e) => set(i, { prices: { ...p.prices, term14: parseInt(e.target.value || "0") } })} />
            </Field>
            <Field label="Key fee">
              <input type="number" className={inputCls} value={p.keyFee} onChange={(e) => set(i, { keyFee: parseInt(e.target.value || "0") })} />
            </Field>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(45,16,15,0.45)" }}>
              Features (one per line)
            </p>
            <textarea
              rows={Math.max(4, p.features.length + 1)}
              className={inputCls}
              value={p.features.join("\n")}
              onChange={(e) => set(i, { features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              placeholder="Real Lankershim Blvd address&#10;Mail scanning dashboard&#10;..."
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── Comparison editor ────────────────────────
function ComparisonEditor({
  plans,
  rows,
  onChange,
}: {
  plans: PricingPlan[];
  rows: ComparisonRow[];
  onChange: (r: ComparisonRow[]) => void;
}) {
  function set(idx: number, patch: Partial<ComparisonRow>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    onChange(rows.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...rows,
      { feature: "New feature", basic: false, business: false, premium: false },
    ]);
  }

  function CellEditor({
    val,
    onSet,
  }: {
    val: boolean | string;
    onSet: (v: boolean | string) => void;
  }) {
    const isBool = typeof val === "boolean";
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSet(true)}
          className="w-7 h-7 rounded-md text-[12px] font-black"
          style={{
            background: val === true ? "#16a34a" : "rgba(45,16,15,0.06)",
            color: val === true ? "white" : "#2D100F",
          }}
          aria-label="Included"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => onSet(false)}
          className="w-7 h-7 rounded-md text-[12px] font-bold"
          style={{
            background: val === false ? "#2D100F" : "rgba(45,16,15,0.06)",
            color: val === false ? "#F7E6C2" : "#2D100F",
          }}
          aria-label="Not included"
        >
          —
        </button>
        <input
          className="rounded-md border px-2 py-1 text-xs font-semibold w-28"
          style={{ borderColor: "rgba(45,16,15,0.18)" }}
          placeholder={isBool ? "Custom text…" : ""}
          value={isBool ? "" : val}
          onChange={(e) => onSet(e.target.value)}
        />
      </div>
    );
  }

  // Pick the first three plan ids for the table columns. If admin renames
  // them we just use whatever their ids are now; the row keys stay
  // basic/business/premium for storage simplicity.
  const planLabels = plans.slice(0, 3).map((p) => p.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Drives the comparison table on /pricing. Use ✓ for included, — for not included, or type a custom value (e.g. "30 days") in the box for that cell.
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10"
          style={{ borderColor: "#337485", color: "#337485" }}
        >
          + Add row
        </button>
      </div>

      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.45)" }}>
        <span>Feature</span>
        <span>{planLabels[0] ?? "Basic"}</span>
        <span>{planLabels[1] ?? "Business"}</span>
        <span>{planLabels[2] ?? "Premium"}</span>
        <span></span>
      </div>

      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 p-2 rounded-xl"
          style={{ background: "#FAFAF8", border: "1px solid rgba(45,16,15,0.08)" }}
        >
          <div className="space-y-1">
            <input className={inputCls} value={r.feature} onChange={(e) => set(i, { feature: e.target.value })} placeholder="Feature name" />
            <input className={inputCls + " text-xs"} value={r.sub ?? ""} onChange={(e) => set(i, { sub: e.target.value })} placeholder="Optional sublabel" />
          </div>
          <CellEditor val={r.basic} onSet={(v) => set(i, { basic: v })} />
          <CellEditor val={r.business} onSet={(v) => set(i, { business: v })} />
          <CellEditor val={r.premium} onSet={(v) => set(i, { premium: v })} />
          <MoveButtons
            onUp={() => onChange(move(rows, i, -1))}
            onDown={() => onChange(move(rows, i, 1))}
            onDel={() => remove(i)}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── Fees editor ────────────────────────
function FeesEditor({
  fees,
  onChange,
}: {
  fees: FeeRow[];
  onChange: (f: FeeRow[]) => void;
}) {
  function set(idx: number, patch: Partial<FeeRow>) {
    onChange(fees.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }
  function remove(idx: number) {
    onChange(fees.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...fees, { label: "New fee", amount: "$0" }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Fee schedule that appears under the plans. Amount is free-form (e.g. <code>$2 / page</code>, <code>Postage + $5</code>).
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10"
          style={{ borderColor: "#337485", color: "#337485" }}
        >
          + Add fee
        </button>
      </div>

      {fees.map((f, i) => (
        <div
          key={i}
          className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-2 p-2 rounded-xl"
          style={{ background: "#FAFAF8", border: "1px solid rgba(45,16,15,0.08)" }}
        >
          <input className={inputCls} value={f.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Late payment" />
          <input className={inputCls} value={f.amount} onChange={(e) => set(i, { amount: e.target.value })} placeholder="$15" />
          <input className={inputCls} value={f.sub ?? ""} onChange={(e) => set(i, { sub: e.target.value })} placeholder="Optional description" />
          <MoveButtons
            onUp={() => onChange(move(fees, i, -1))}
            onDown={() => onChange(move(fees, i, 1))}
            onDel={() => remove(i)}
          />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────── Policies editor ────────────────────────
function PoliciesEditor({
  policies,
  onChange,
}: {
  policies: PolicyItem[];
  onChange: (p: PolicyItem[]) => void;
}) {
  function set(idx: number, patch: Partial<PolicyItem>) {
    onChange(policies.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function remove(idx: number) {
    onChange(policies.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...policies, { title: "New policy", body: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Each policy renders as a collapsible accordion on /pricing.
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10"
          style={{ borderColor: "#337485", color: "#337485" }}
        >
          + Add policy
        </button>
      </div>

      {policies.map((p, i) => (
        <div
          key={i}
          className="p-3 rounded-xl space-y-2"
          style={{ background: "#FAFAF8", border: "1px solid rgba(45,16,15,0.08)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <input className={inputCls + " font-bold"} value={p.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Policy title" />
            <MoveButtons
              onUp={() => onChange(move(policies, i, -1))}
              onDown={() => onChange(move(policies, i, 1))}
              onDel={() => remove(i)}
            />
          </div>
          <textarea
            rows={3}
            className={inputCls}
            value={p.body}
            onChange={(e) => set(i, { body: e.target.value })}
            placeholder="Plain-text description of the policy."
          />
        </div>
      ))}
    </div>
  );
}
