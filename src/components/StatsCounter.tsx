"use client";

/**
 * Animated number that counts up from 0 → target value the first time it
 * scrolls into view. Targets are parsed from human-readable strings like
 * "4,500+", "99.9%", "<2 hr", "5.0 ★" — everything around the number is
 * preserved as a static suffix/prefix so the typography stays identical.
 *
 * Respects prefers-reduced-motion (renders the final value immediately).
 */
import { useEffect, useRef, useState } from "react";

type Props = {
  /** The full display value, e.g. "4,500+" or "99.9%" or "<2 hr" */
  value: string;
  /** Total animation time in ms */
  durationMs?: number;
};

function splitValue(raw: string): {
  prefix: string;
  number: string;
  suffix: string;
  decimals: number;
  target: number;
} {
  // Match the first number in the string (digits + optional decimal).
  const m = raw.match(/(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)/);
  if (!m) return { prefix: raw, number: "", suffix: "", decimals: 0, target: 0 };
  const numStr = m[0];
  const idx = m.index ?? 0;
  const prefix = raw.slice(0, idx);
  const suffix = raw.slice(idx + numStr.length);
  const decimals = (numStr.split(".")[1] ?? "").length;
  const target = parseFloat(numStr.replace(/,/g, ""));
  return { prefix, number: numStr, suffix, decimals, target };
}

function formatLike(value: number, template: string, decimals: number): string {
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: template.includes(","),
  };
  return new Intl.NumberFormat("en-US", opts).format(value);
}

export function StatsCounter({ value, durationMs = 1200 }: Props) {
  const { prefix, number, suffix, decimals, target } = splitValue(value);
  const [display, setDisplay] = useState<string>(
    decimals > 0 ? formatLike(0, number, decimals) : "0",
  );
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      setDisplay(number);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          // ease-out-cubic for a confident, settling feel
          const startTime = performance.now();
          let raf = 0;
          const tick = (now: number) => {
            const t = Math.min(1, (now - startTime) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const cur = target * eased;
            setDisplay(decimals > 0 ? formatLike(cur, number, decimals) : formatLike(Math.round(cur), number, 0));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          // No teardown needed — fires once.
          void raf;
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [target, decimals, durationMs, number]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
