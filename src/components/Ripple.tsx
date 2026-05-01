"use client";

/**
 * Branded click ripple. Mounts once at the root layout — listens globally
 * for `pointerdown` on `[data-ripple]` (or any element wrapped in
 * `.cta-primary`) and animates a short circular wash from the click point.
 *
 * Color auto-adapts: cream over dark backgrounds, brand-blue over light ones.
 * Respects prefers-reduced-motion (no-op).
 */
import { useEffect } from "react";

function isLightBg(color: string): boolean {
  // color: "rgb(r, g, b)" or "rgba(...)" or "transparent"
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return true;
  const m = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return true;
  const r = parseInt(m[1], 10);
  const g = parseInt(m[2], 10);
  const b = parseInt(m[3], 10);
  // Relative luminance, sRGB
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55;
}

export function Ripple() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    function onDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      const host = target.closest<HTMLElement>("[data-ripple], .cta-primary");
      if (!host) return;

      // Only animate primary buttons, not random page elements.
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.4;

      // Make sure host can position the ripple absolutely without breaking layout.
      const computed = getComputedStyle(host);
      if (computed.position === "static") {
        host.style.position = "relative";
      }
      const prevOverflow = host.style.overflow;
      host.style.overflow = "hidden";

      const bg = computed.backgroundColor;
      const light = isLightBg(bg);

      const ripple = document.createElement("span");
      ripple.style.position = "absolute";
      ripple.style.left = `${x - size / 2}px`;
      ripple.style.top = `${y - size / 2}px`;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.borderRadius = "50%";
      ripple.style.pointerEvents = "none";
      ripple.style.background = light
        ? "radial-gradient(circle, rgba(51,116,133,0.4) 0%, rgba(51,116,133,0.18) 60%, rgba(51,116,133,0) 80%)"
        : "radial-gradient(circle, rgba(247,230,194,0.55) 0%, rgba(247,230,194,0.22) 60%, rgba(247,230,194,0) 80%)";
      ripple.style.transform = "scale(0)";
      ripple.style.opacity = "1";
      ripple.style.transition = "transform 600ms cubic-bezier(0.22,1,0.36,1), opacity 700ms ease-out";
      ripple.style.zIndex = "0";

      host.appendChild(ripple);
      // Force layout so the transition triggers.
      void ripple.offsetWidth;
      ripple.style.transform = "scale(1)";
      ripple.style.opacity = "0";

      window.setTimeout(() => {
        ripple.remove();
        // Restore overflow if we changed it (don't blindly clobber).
        if (prevOverflow) host.style.overflow = prevOverflow;
      }, 700);
    }

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return null;
}
