"use client";

/**
 * Branded interactive cursor for the desktop site.
 * - Cream + brown outer ring with a brand-blue dot inside (matches the logo)
 * - Expands and softens over interactive elements (links, buttons, [role=button])
 * - Becomes an I-beam over text inputs / textareas / contenteditable
 * - Auto-disabled on touch devices and for prefers-reduced-motion users (CSS)
 *
 * Mounted at the root layout so it covers every page.
 */
import { useEffect, useRef } from "react";

export function InteractiveCursor() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only run on devices with a fine pointer + hover capability.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const el = ref.current;
    if (!el) return;
    const cursorEl: HTMLDivElement = el;

    document.documentElement.classList.add("has-noho-cursor");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;

    const tick = () => {
      // Smooth easing toward target
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    function isPointerTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof Element)) return false;
      return !!t.closest(
        'a, button, [role="button"], [data-cursor-pointer], input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], summary, label[for]',
      );
    }
    function isTextTarget(t: EventTarget | null): boolean {
      if (!t || !(t instanceof Element)) return false;
      return !!t.closest('input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
    }

    // Label resolution — small, signature touch.
    function labelFor(t: EventTarget | null): string {
      if (!t || !(t instanceof Element)) return "";
      const explicit = t.closest<HTMLElement>("[data-cursor-label]");
      if (explicit) return explicit.dataset.cursorLabel ?? "";
      const a = t.closest<HTMLAnchorElement>("a[href]");
      if (a) {
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("tel:")) return "Call";
        if (href.startsWith("mailto:")) return "Email";
        if (href.startsWith("/signup")) return "Sign up";
        if (href.startsWith("/login")) return "Sign in";
        if (href.startsWith("#")) return "Jump to";
        if (a.target === "_blank") return "New tab";
        return "";
      }
      const btn = t.closest<HTMLElement>('button, [role="button"]');
      if (btn) {
        const t2 = btn.getAttribute("aria-label");
        if (t2 && t2.length <= 16) return t2;
      }
      return "";
    }

    // Find or lazily create the label element inside the cursor disc.
    let labelEl = cursorEl.querySelector<HTMLSpanElement>(".noho-cursor__label");
    if (!labelEl) {
      labelEl = document.createElement("span");
      labelEl.className = "noho-cursor__label";
      cursorEl.appendChild(labelEl);
    }
    const labelNode: HTMLSpanElement = labelEl;
    let lastLabel = "";

    function onMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target;
      const ptr = isPointerTarget(t);
      cursorEl.classList.toggle("is-pointer", ptr);
      cursorEl.classList.toggle("is-text", isTextTarget(t));
      const next = ptr ? labelFor(t) : "";
      if (next !== lastLabel) {
        lastLabel = next;
        if (next) {
          labelNode.textContent = next;
          cursorEl.classList.add("has-label");
        } else {
          cursorEl.classList.remove("has-label");
        }
      }
    }
    function onEnter() { cursorEl.style.opacity = "1"; }
    function onLeave() { cursorEl.style.opacity = "0"; }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseenter", onEnter);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("has-noho-cursor");
    };
  }, []);

  return <div ref={ref} className="noho-cursor" aria-hidden="true" />;
}
