"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATE_LLC_PAGES } from "@/lib/state-llc-pages";

// Sort states alphabetically by name for the dropdown.
const STATES_ALPHA = [...STATE_LLC_PAGES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const REGISTERED_AGENT_DEFAULT = 150; // mid-tier annual price

type StateCalc = {
  slug: string;
  name: string;
  abbr: string;
  filingFee: number;
  franchiseAnnual: number; // 0 if not applicable
  reportAnnualEquivalent: number; // annualized report fee
  registeredAgent: number;
  year1Total: number;
  fiveYearTotal: number;
};

function annualizeReport(
  fee: number,
  cadence: string | undefined,
): number {
  if (!cadence) return fee;
  const c = cadence.toLowerCase();
  if (c.includes("every 2 years") || c.includes("biennial")) {
    return Math.round(fee / 2);
  }
  return fee;
}

function computeForState(slug: string, agentCost: number): StateCalc | null {
  const s = STATE_LLC_PAGES.find((x) => x.slug === slug);
  if (!s) return null;

  const reportFee = s.annualReport?.fee ?? 0;
  const reportCadence = s.annualReport?.cadence;
  const reportAnnual = annualizeReport(reportFee, reportCadence);
  const franchiseAnnual = s.franchiseTax?.amount ?? 0;

  const year1 = s.filingFee + franchiseAnnual + reportAnnual + agentCost;
  // Year 2-5: no filing fee, just recurring franchise + report + agent
  const fiveYear =
    s.filingFee + (franchiseAnnual + reportAnnual + agentCost) * 5;

  return {
    slug: s.slug,
    name: s.name,
    abbr: s.abbr,
    filingFee: s.filingFee,
    franchiseAnnual,
    reportAnnualEquivalent: reportAnnual,
    registeredAgent: agentCost,
    year1Total: year1,
    fiveYearTotal: fiveYear,
  };
}

const fmt = (n: number): string =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function LLCCostCalculatorClient() {
  const [stateA, setStateA] = useState("california");
  const [stateB, setStateB] = useState("wyoming");
  const [stateC, setStateC] = useState("delaware");
  const [agentCost, setAgentCost] = useState(REGISTERED_AGENT_DEFAULT);

  const calcs = useMemo(() => {
    const results: StateCalc[] = [];
    for (const slug of [stateA, stateB, stateC]) {
      const c = computeForState(slug, agentCost);
      if (c) results.push(c);
    }
    return results;
  }, [stateA, stateB, stateC, agentCost]);

  // Sort calcs by Year 1 total ascending so cheapest shows first.
  const sorted = useMemo(
    () => [...calcs].sort((a, b) => a.year1Total - b.year1Total),
    [calcs],
  );

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8D8C4",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h2 className="font-extrabold tracking-tight text-text-light text-xl mb-4">
          Pick up to 3 states to compare
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { v: stateA, set: setStateA, label: "State A" },
            { v: stateB, set: setStateB, label: "State B" },
            { v: stateC, set: setStateC, label: "State C" },
          ].map((s) => (
            <label key={s.label} className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-light-muted">
                {s.label}
              </span>
              <select
                value={s.v}
                onChange={(e) => s.set(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  color: "#2D100F",
                }}
              >
                {STATES_ALPHA.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-5">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-light-muted">
              Registered Agent Cost / Year ($)
            </span>
            <input
              type="number"
              min={0}
              max={500}
              step={25}
              value={agentCost}
              onChange={(e) =>
                setAgentCost(Math.max(0, Number(e.target.value) || 0))
              }
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                color: "#2D100F",
              }}
            />
          </label>
          <p className="mt-1 text-xs text-text-light-muted">
            Default: $150 (mid-tier service). Free if you use your own
            in-state address. Premium services charge $300+. NOHO Mailbox
            customers in CA: included free with the $2,000 bundle.
          </p>
        </div>
      </div>

      {/* Results — sorted, cheapest first */}
      <div className="space-y-3">
        {sorted.map((c, i) => {
          const isCheapest = i === 0 && sorted.length > 1;
          return (
            <div
              key={c.slug}
              className="rounded-2xl p-6"
              style={{
                background: isCheapest ? "#FEF7E5" : "#FFFFFF",
                border: isCheapest
                  ? "2px solid #F5A623"
                  : "1px solid #E8D8C4",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <h3 className="font-extrabold tracking-tight text-text-light text-lg">
                  {c.name}{" "}
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#7A6050" }}
                  >
                    {c.abbr}
                  </span>
                  {isCheapest && (
                    <span
                      className="ml-3 inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider align-middle"
                      style={{
                        background: "#F5A623",
                        color: "#2D100F",
                      }}
                    >
                      Cheapest
                    </span>
                  )}
                </h3>
                <Link
                  href={`/business-solutions/${c.slug}`}
                  className="text-xs font-bold underline"
                  style={{ color: "#337485" }}
                >
                  View {c.abbr} guide →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Tile label="Filing fee" value={fmt(c.filingFee)} sub="One-time" />
                <Tile
                  label="Franchise tax"
                  value={fmt(c.franchiseAnnual)}
                  sub="Annual"
                  emphasize={c.franchiseAnnual >= 300}
                />
                <Tile
                  label="Annual report"
                  value={fmt(c.reportAnnualEquivalent)}
                  sub="Annualized"
                />
                <Tile
                  label="Reg. agent"
                  value={fmt(c.registeredAgent)}
                  sub="Annual"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Tile
                  label="Year 1 total"
                  value={fmt(c.year1Total)}
                  sub=""
                  big
                />
                <Tile
                  label="5-year total"
                  value={fmt(c.fiveYearTotal)}
                  sub=""
                  big
                  alt
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-6 mt-6"
        style={{
          background: "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
          color: "#fff",
          boxShadow: "0 12px 40px #B0703044",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-2"
          style={{ color: "#FFE4A0" }}
        >
          $2,000 BUSINESS LAUNCH BUNDLE
        </p>
        <h3
          className="font-extrabold tracking-tight text-2xl mb-3"
          style={{ color: "#FFE4A0" }}
        >
          California LLC done right — for one flat price
        </h3>
        <p
          className="text-sm leading-relaxed mb-4"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          California LLC formation + EIN + brand kit + 5-page website + 12
          months of mail at our LA address + free notarized Form 1583.
          Everything you need to launch — done in 14 days flat. Most
          piecemeal services run $4,000-$6,000 for the same components.
        </p>
        <Link
          href="/business-solutions"
          className="inline-block font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-1"
          style={{
            background: "#FFE4A0",
            color: "#2D100F",
          }}
        >
          See the bundle →
        </Link>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  emphasize,
  big,
  alt,
}: {
  label: string;
  value: string;
  sub: string;
  emphasize?: boolean;
  big?: boolean;
  alt?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: alt
          ? "rgba(51,116,133,0.12)"
          : emphasize
            ? "#FFEDD5"
            : "#FFF9F3",
        border: `1px solid ${alt ? "rgba(51,116,133,0.25)" : emphasize ? "#FED7AA" : "#E8D8C4"}`,
      }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-widest"
        style={{ color: alt ? "#1F4A55" : "#7A6050" }}
      >
        {label}
      </p>
      <p
        className={`font-extrabold tracking-tight tabular-nums ${big ? "text-2xl" : "text-base"}`}
        style={{ color: alt ? "#1F4A55" : emphasize ? "#9A3412" : "#2D100F" }}
      >
        {value}
      </p>
      {sub ? (
        <p
          className="text-[10px]"
          style={{ color: alt ? "#1F4A55" : "#7A6050", opacity: 0.7 }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
