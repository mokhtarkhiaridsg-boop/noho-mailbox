"use client";

// iter-110 — Locale React context + provider + hook.
//
// Reads the persisted locale from a cookie at first render (passed down
// by the server-rendered layout), keeps it in state, and exposes a
// setter that:
//   1. updates state immediately (UI flips)
//   2. writes the cookie so future page loads remember
//   3. flips document.documentElement.dir for RTL languages
//
// Components call useT() to translate; useLocale() to read/set.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_COOKIE, LOCALE_META, translate, type DictKey, type Locale } from "./dictionary";

type Ctx = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: DictKey) => string;
  dir: "ltr" | "rtl";
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    // Cookie: 1 year, root path, lax samesite.
    if (typeof document !== "undefined") {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.documentElement.dir = LOCALE_META[next].dir;
      document.documentElement.lang = next;
    }
  }, []);

  // On mount, ensure dir/lang attrs match (in case the SSR pass picked
  // a different default than the client cookie).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = LOCALE_META[locale].dir;
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback((key: DictKey) => translate(key, locale), [locale]);

  const value = useMemo<Ctx>(() => ({
    locale,
    setLocale,
    t,
    dir: LOCALE_META[locale].dir,
  }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Soft fallback: if a component renders outside the provider, return a
    // locale-less shim that just echoes the English copy. Avoids crashing
    // marketing/auth pages that may not mount the provider.
    return {
      locale: "en",
      setLocale: () => undefined,
      t: (key) => translate(key, "en"),
      dir: "ltr",
    };
  }
  return ctx;
}

// Convenience: just translation (matches useT() shape from many libs).
export function useT(): (key: DictKey) => string {
  return useLocale().t;
}
