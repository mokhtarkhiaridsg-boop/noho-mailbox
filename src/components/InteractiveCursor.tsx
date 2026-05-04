"use client";

/**
 * Interactive cursor — regular arrow shape, blue tint, click feedback.
 *
 * Was a chunky cream/brown disc with a context label. The new design is
 * subtler: a normal pointer-arrow silhouette in blue (matches the iPad-OS
 * sidebar accent), a small ring scale + tactile "tick" sound on click.
 *
 * Auto-disabled on touch devices and for prefers-reduced-motion users.
 */
import { useEffect, useRef } from "react";

export function InteractiveCursor() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
      // Tighter easing — feels closer to a real cursor, not a balloon.
      x += (tx - x) * 0.42;
      y += (ty - y) * 0.42;
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
      return !!t.closest(
        'input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]',
      );
    }

    // ─── Click sound — tiny synthesised "tick" using WebAudio ───────────
    // No asset request, no mp3 load — generate the sound at click time.
    // Two short sine pings (mouse-down + mouse-up feel) keep it tactile
    // without being intrusive. Lazy-init the AudioContext on first user
    // gesture (browsers block autoplay otherwise).
    let audio: AudioContext | null = null;
    function ensureAudio(): AudioContext | null {
      if (audio) return audio;
      const C =
        (window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!C) return null;
      try {
        audio = new C();
        return audio;
      } catch {
        return null;
      }
    }
    function playTick(freq: number, duration: number, gain: number) {
      const ctx = ensureAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.value = 0;
      osc.connect(g).connect(ctx.destination);
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    }

    function onMove(e: MouseEvent) {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target;
      cursorEl.classList.toggle("is-pointer", isPointerTarget(t));
      cursorEl.classList.toggle("is-text", isTextTarget(t));
    }
    function onEnter() { cursorEl.style.opacity = "1"; }
    function onLeave() { cursorEl.style.opacity = "0"; }
    function onMouseDown(e: MouseEvent) {
      cursorEl.classList.add("is-down");
      // Only play the click if we're on a real interactive target —
      // otherwise dragging text fires too.
      if (isPointerTarget(e.target)) {
        playTick(880, 0.06, 0.05);
      }
    }
    function onMouseUp(e: MouseEvent) {
      cursorEl.classList.remove("is-down");
      if (isPointerTarget(e.target)) {
        playTick(620, 0.05, 0.04);
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseenter", onEnter);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.documentElement.classList.remove("has-noho-cursor");
      if (audio) {
        try { audio.close(); } catch { /* noop */ }
      }
    };
  }, []);

  return (
    <div ref={ref} className="noho-cursor" aria-hidden="true">
      {/* Regular arrow silhouette — same shape as the OS pointer, just
          painted in brand blue. Inline SVG so we never wait on assets. */}
      <svg
        className="noho-cursor__arrow"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="#1976FF"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        <path d="M4 2 L4 18 L9 14 L11.5 21 L14.2 19.8 L11.7 13 L18 13 Z" />
      </svg>
    </div>
  );
}
