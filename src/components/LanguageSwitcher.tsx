"use client";

// iter-110 — Language switcher chip.
//
// Renders three pill buttons (EN / FR / AR). On click:
//   1. Updates client state immediately via LocaleProvider.setLocale
//   2. Calls setLocaleAction so the cookie is persisted server-side
//      (so SSR/server components on the next request render in that lang)

import { useTransition } from "react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/dictionary";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { setLocaleAction } from "@/app/actions/locale";

const NOHO_BLUE = "#337485";
const NOHO_INK = "#2D100F";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    startTransition(async () => {
      try { await setLocaleAction(next); } catch { /* cookie failed — client state still updates */ }
    });
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(45,29,15,0.10)",
        backdropFilter: "blur(8px)",
      }}
      role="group"
      aria-label="Choose language"
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        const meta = LOCALE_META[l];
        return (
          <button
            key={l}
            type="button"
            onClick={() => pick(l)}
            disabled={pending && !active}
            aria-pressed={active}
            aria-label={`Switch to ${meta.label}`}
            title={meta.label}
            className="px-2.5 py-1 rounded-full text-[11px] font-black transition-colors"
            style={{
              background: active ? NOHO_BLUE : "transparent",
              color: active ? "white" : NOHO_INK,
            }}
          >
            <span aria-hidden="true">{meta.flag}</span>
            {!compact && <span className="ml-1.5">{l.toUpperCase()}</span>}
          </button>
        );
      })}
    </div>
  );
}
