"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const THEFT_RATE = 0.13; // LA average residential porch piracy
const TIME_PER_WEEK_MIN = 30; // avg minutes per week dealing with mail
const TIME_SAVED_PCT = 0.8; // 80% of mail-handling time saved with CMRA + scanning
const NOHO_BASIC_QUARTERLY = 50;
const NOHO_BUSINESS_QUARTERLY = 80;

function dollars(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function MailboxROICalculatorClient() {
  const [packagesPerMonth, setPackagesPerMonth] = useState(8);
  const [avgPackageValue, setAvgPackageValue] = useState(40);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [livingSituation, setLivingSituation] = useState<"apartment" | "house" | "gated">(
    "apartment"
  );

  // Adjusted theft rate by living situation
  const adjustedTheftRate = useMemo(() => {
    if (livingSituation === "apartment") return 0.18;
    if (livingSituation === "gated") return 0.04;
    return THEFT_RATE;
  }, [livingSituation]);

  const annual = useMemo(() => {
    const packagesPerYear = packagesPerMonth * 12;
    const stolen = packagesPerYear * adjustedTheftRate;
    const theftCost = stolen * avgPackageValue;
    const timeWastedHrsPerYear = (TIME_PER_WEEK_MIN / 60) * 52;
    const timeCost = timeWastedHrsPerYear * hourlyRate;
    const timeSavings = timeCost * TIME_SAVED_PCT;
    const mailboxCostBasic = NOHO_BASIC_QUARTERLY * 4;
    const mailboxCostBusiness = NOHO_BUSINESS_QUARTERLY * 4;
    const totalCurrentLoss = theftCost + timeCost;
    const totalNohoLoss = mailboxCostBasic + (timeCost - timeSavings);
    const totalSaved = totalCurrentLoss - totalNohoLoss;

    return {
      packagesPerYear,
      stolen: Math.round(stolen),
      theftCost: Math.round(theftCost),
      timeCost: Math.round(timeCost),
      timeSavings: Math.round(timeSavings),
      mailboxCostBasic,
      mailboxCostBusiness,
      totalCurrentLoss: Math.round(totalCurrentLoss),
      totalNohoLoss: Math.round(totalNohoLoss),
      totalSaved: Math.round(totalSaved),
    };
  }, [packagesPerMonth, avgPackageValue, hourlyRate, adjustedTheftRate]);

  return (
    <div
      className="rounded-2xl p-6 md:p-8 space-y-6"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <h2 className="text-xl font-extrabold tracking-tight text-text-light">
        Your situation
      </h2>

      {/* Living situation */}
      <div>
        <label className="block text-sm font-bold text-text-light mb-2">
          Where do you currently get packages?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "apartment", label: "Apartment", sub: "high theft" },
            { id: "house", label: "House", sub: "moderate" },
            { id: "gated", label: "Gated", sub: "low theft" },
          ] as const).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setLivingSituation(s.id)}
              className="text-left p-3 rounded-xl transition-all"
              style={{
                background: livingSituation === s.id ? "rgba(51,116,133,0.12)" : "#FFFFFF",
                border:
                  livingSituation === s.id
                    ? "2px solid #337485"
                    : "1px solid #D8C8B4",
                color: "#2D100F",
              }}
            >
              <p className="text-sm font-bold">{s.label}</p>
              <p className="text-[11px] text-text-light-muted">{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Packages per month */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-bold text-text-light">
            Packages per month
          </label>
          <span className="text-2xl font-extrabold" style={{ color: "#337485" }}>
            {packagesPerMonth}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={packagesPerMonth}
          onChange={(e) => setPackagesPerMonth(parseInt(e.target.value, 10))}
          className="w-full"
          style={{ accentColor: "#337485" }}
        />
        <div className="flex justify-between text-[11px] text-text-light-muted mt-1">
          <span>1</span>
          <span>50</span>
        </div>
      </div>

      {/* Avg value */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-bold text-text-light">
            Average package value
          </label>
          <span className="text-2xl font-extrabold" style={{ color: "#337485" }}>
            ${avgPackageValue}
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={avgPackageValue}
          onChange={(e) => setAvgPackageValue(parseInt(e.target.value, 10))}
          className="w-full"
          style={{ accentColor: "#337485" }}
        />
        <div className="flex justify-between text-[11px] text-text-light-muted mt-1">
          <span>$10</span>
          <span>$300</span>
        </div>
      </div>

      {/* Hourly rate */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-bold text-text-light">
            Your hourly rate (for time-cost math)
          </label>
          <span className="text-2xl font-extrabold" style={{ color: "#337485" }}>
            ${hourlyRate}/hr
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={200}
          step={5}
          value={hourlyRate}
          onChange={(e) => setHourlyRate(parseInt(e.target.value, 10))}
          className="w-full"
          style={{ accentColor: "#337485" }}
        />
        <div className="flex justify-between text-[11px] text-text-light-muted mt-1">
          <span>$15</span>
          <span>$200</span>
        </div>
      </div>

      {/* Results */}
      <div
        className="rounded-2xl p-6 mt-6"
        style={{
          background:
            "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
          color: "#fff",
          boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#FFE4A0" }}
        >
          Your annual situation
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider mb-1">
              Stolen packages
            </p>
            <p className="text-3xl font-extrabold" style={{ color: "#FFE4A0" }}>
              ~{annual.stolen}/yr
            </p>
            <p className="text-xs opacity-80">
              ≈ {dollars(annual.theftCost)} lost
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider mb-1">
              Time wasted on mail
            </p>
            <p className="text-3xl font-extrabold" style={{ color: "#FFE4A0" }}>
              {dollars(annual.timeCost)}
            </p>
            <p className="text-xs opacity-80">at ${hourlyRate}/hr</p>
          </div>
        </div>

        <div className="border-t border-white/20 pt-4">
          <p className="text-[11px] font-semibold opacity-80 uppercase tracking-wider mb-1">
            Total annual exposure
          </p>
          <p className="text-4xl md:text-5xl font-extrabold mb-3" style={{ color: "#FFE4A0" }}>
            {dollars(annual.totalCurrentLoss)}
          </p>
        </div>
      </div>

      {/* Comparison */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "rgba(22,163,74,0.08)",
          border: "1px solid rgba(22,163,74,0.2)",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: "#15803d" }}
        >
          With NOHO Mailbox Basic ({dollars(annual.mailboxCostBasic)}/yr)
        </p>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p
              className="text-[10px] uppercase tracking-wider opacity-70"
              style={{ color: "#15803d" }}
            >
              Stolen
            </p>
            <p className="text-2xl font-extrabold" style={{ color: "#15803d" }}>
              0
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-wider opacity-70"
              style={{ color: "#15803d" }}
            >
              Time saved
            </p>
            <p className="text-2xl font-extrabold" style={{ color: "#15803d" }}>
              {dollars(annual.timeSavings)}
            </p>
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-wider opacity-70"
              style={{ color: "#15803d" }}
            >
              Mailbox cost
            </p>
            <p className="text-2xl font-extrabold" style={{ color: "#15803d" }}>
              {dollars(annual.mailboxCostBasic)}
            </p>
          </div>
        </div>
        <div
          className="border-t pt-3 mt-3"
          style={{ borderColor: "rgba(22,163,74,0.2)" }}
        >
          <p
            className="text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: "#15803d" }}
          >
            Net annual savings
          </p>
          <p className="text-4xl font-extrabold" style={{ color: "#15803d" }}>
            {dollars(annual.totalSaved)}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t" style={{ borderColor: "#E8D8C4" }}>
        <p className="text-sm text-text-light mb-3">
          {annual.totalSaved > 0 ? (
            <>
              Based on your numbers, a NOHO Mailbox Basic plan saves you{" "}
              <strong>{dollars(annual.totalSaved)} per year</strong>.
            </>
          ) : (
            <>Your situation may not need a mailbox yet — if your numbers go up, come back.</>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            className="text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 text-center"
            style={{ background: "#337485" }}
          >
            See plans →
          </Link>
          <Link
            href="/signup"
            className="font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 text-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid #337485",
              color: "#337485",
            }}
          >
            Request a mailbox
          </Link>
        </div>
      </div>
    </div>
  );
}
