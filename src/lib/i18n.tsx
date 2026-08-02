/**
 * Minimal i18n scaffolding (es default, en ready).
 * Replace the in-memory dictionary with remote locales when needed.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "es" | "en";

const dictionary = {
  es: {
    "nav.product": "Producto",
    "nav.how": "Cómo funciona",
    "nav.pricing": "Precios",
    "nav.faq": "FAQ",
    "cta.start": "Empieza Gratis",
    "cta.demo": "Ver Demo",
  },
  en: {
    "nav.product": "Product",
    "nav.how": "How it works",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "cta.start": "Start free",
    "cta.demo": "Watch demo",
  },
} satisfies Record<Locale, Record<string, string>>;

type Key = keyof (typeof dictionary)["es"];

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: Key) => string;
}>({ locale: "es", setLocale: () => {}, t: (k) => dictionary.es[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");
  const value = useMemo(
    () => ({ locale, setLocale, t: (key: Key) => dictionary[locale][key] }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
