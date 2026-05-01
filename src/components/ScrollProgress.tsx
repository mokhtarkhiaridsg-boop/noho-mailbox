"use client";

/**
 * 2px scroll-progress rail across the top of every page.
 * Track is cream, fill is brand-blue. Respects prefers-reduced-motion
 * (renders flat at 0% and never updates).
 */
import { useEffect, useRef } from "react";

export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    let ticking = false;
    function update() {
      const fill = fillRef.current;
      if (!fill) return;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const pct = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
      fill.style.width = `${pct}%`;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "rgba(247,230,194,0.6)",
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      <div
        ref={fillRef}
        style={{
          width: 0,
          height: "100%",
          background: "#337485",
          transition: "width 80ms linear",
        }}
      />
    </div>
  );
}
