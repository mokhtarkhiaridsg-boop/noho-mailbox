"use client";

/**
 * iter-183 — Multi-language member dashboard (Tier 12 #92).
 *
 * Card on SettingsPanel that lets members pick their dashboard
 * language. Cookie-only writes (iter-110 LanguageSwitcher pattern)
 * scoped to the current device — but THIS card writes to User.locale
 * via `setMyLocale` so the choice persists across devices and signs
 * back in.
 *
 * Three options: English / Français / العربية. RTL flips automatically
 * via the existing LocaleProvider on `ar` selection.
 */

import { useTransition } from "react";
import { BRAND } from "./types";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/dictionary";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import { setMyLocale } from "@/app/actions/locale";

export default function LocaleSettingCard() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [busy, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    startTransition(async () => {
      try { await setMyLocale(next); } catch { /* cookie still set */ }
    });
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
          {t("i18n.language")}
        </p>
        <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
          {t("i18n.dashboard_language")}
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
          {t("i18n.choose_language_help")}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {LOCALES.map((l) => {
          const meta = LOCALE_META[l];
          const active = locale === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => pick(l)}
              disabled={busy && !active}
              aria-pressed={active}
              className="rounded-xl px-3 py-3 text-left transition-shadow"
              style={{
                background: active ? "rgba(25,118,255,0.06)" : "white",
                border: `2px solid ${active ? BRAND.blue : BRAND.border}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden style={{ fontSize: 22 }}>{meta.flag}</span>
                <div>
                  <p className="text-[13px] font-black" style={{ color: BRAND.ink }}>{meta.nativeLabel}</p>
                  <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>{meta.label} · {meta.dir.toUpperCase()}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10.5px]" style={{ color: BRAND.inkFaint }}>
        ✓ {t("i18n.synced_across_devices")}
      </p>
    </section>
  );
}
