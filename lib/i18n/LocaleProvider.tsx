'use client';

/**
 * The locale, for client components.
 *
 * A context rather than a module-level variable: the server renders for
 * whoever is asking, and a module global is wrong the moment two requests
 * overlap. The provider takes the locale the server resolved, so client and
 * server render the same words and hydration does not mismatch.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { DEFAULT_LOCALE, translator, type Locale, type MessageKey } from '.';

interface LocaleContextValue {
  locale: Locale;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: translator(DEFAULT_LOCALE),
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Shorthand for the common case. */
export function useT(): (key: MessageKey) => string {
  return useContext(LocaleContext).t;
}
