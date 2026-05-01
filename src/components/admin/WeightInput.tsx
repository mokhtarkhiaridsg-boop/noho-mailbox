"use client";

import { useEffect, useState } from "react";
import { parseWeightInput, formatWeightOz, type WeightUnit } from "@/lib/units";

type Props = {
  /** Canonical value in ounces. Pass NaN/0 for empty. */
  valueOz: number | "";
  /** Called whenever a valid parse succeeds. */
  onChangeOz: (oz: number) => void;
  /** Called when input is cleared or invalid. */
  onClear?: () => void;
  /** Default unit used when admin types a bare number. */
  defaultUnit?: WeightUnit;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Single text input that accepts: "36 oz", "2 lb 6 oz", "2.4 lb", "2.4".
 * Bare numbers are interpreted using `defaultUnit` (toggle next to the input).
 * Shows a green check when valid, a small hint above when invalid.
 */
export function WeightInput({
  valueOz,
  onChangeOz,
  onClear,
  defaultUnit = "lb",
  className = "",
  placeholder,
  disabled,
  id,
}: Props) {
  const [unit, setUnit] = useState<WeightUnit>(defaultUnit);
  const [text, setText] = useState<string>(() =>
    typeof valueOz === "number" && valueOz > 0 ? formatWeightOz(valueOz, defaultUnit) : "",
  );
  const [error, setError] = useState<string | null>(null);

  // Sync text when caller changes valueOz externally OR when the unit toggle flips.
  // Both can require a re-format of the displayed text. Without `unit` in deps,
  // toggling lb⇄oz left the input stale and the next keystroke parsed in the
  // wrong frame (e.g. "2.5 lb" reinterpreted as 2.5 oz).
  useEffect(() => {
    if (typeof valueOz !== "number" || valueOz <= 0) {
      setText("");
      setError(null);
      return;
    }
    const parsed = parseWeightInput(text, unit);
    if (parsed == null || Math.abs(parsed - valueOz) > 0.05) {
      setText(formatWeightOz(valueOz, unit));
    }
    // text is intentionally excluded — including it would cause infinite re-renders
    // since handleChange writes to text on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueOz, unit]);

  function handleChange(next: string) {
    setText(next);
    if (!next.trim()) {
      setError(null);
      onClear?.();
      return;
    }
    const oz = parseWeightInput(next, unit);
    if (oz == null || oz <= 0) {
      setError(`Try "${unit === "lb" ? "2.5" : "36"}", "2 lb 6 oz", or "${unit === "lb" ? "2.5 lb" : "36 oz"}"`);
      return;
    }
    setError(null);
    onChangeOz(oz);
  }

  function toggleUnit() {
    const newUnit: WeightUnit = unit === "lb" ? "oz" : "lb";
    setUnit(newUnit);
    if (typeof valueOz === "number" && valueOz > 0) {
      setText(formatWeightOz(valueOz, newUnit));
    }
  }

  const ozPreview =
    typeof valueOz === "number" && valueOz > 0 && !error
      ? `= ${valueOz.toFixed(1)} oz`
      : null;

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2 items-stretch">
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder ?? (unit === "lb" ? "e.g. 2 lb 6 oz" : "e.g. 38 oz")}
          disabled={disabled}
          inputMode="decimal"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50"
          style={{ background: "#FFF9F3", border: `1px solid ${error ? "#fca5a5" : "#E8DDD0"}`, color: "#2D100F" }}
        />
        <button
          type="button"
          onClick={toggleUnit}
          disabled={disabled}
          className="px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
          style={{ background: "#337485", color: "#fff" }}
          title="Toggle default input unit"
        >
          {unit}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1 min-h-[16px]">
        {error ? (
          <p className="text-[10px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>
        ) : (
          <span className="text-[10px]" style={{ color: "#7A6050" }}>
            Enter as oz, lb, or &ldquo;lb&nbsp;oz&rdquo; — auto-converts
          </span>
        )}
        {ozPreview && (
          <span className="text-[10px] font-bold" style={{ color: "#16a34a" }}>{ozPreview}</span>
        )}
      </div>
    </div>
  );
}
