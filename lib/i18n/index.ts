/**
 * Locale resolution and message lookup.
 *
 * Pure and framework-free, so a route handler, a React component and a test
 * all get the same answer. There is no `t()` that reaches into a global —
 * the locale is passed in, because the server renders for whoever is asking
 * and a module-level "current locale" is wrong the moment two requests
 * overlap.
 */

import { CATALOGUES, DEFAULT_LOCALE, LOCALES, type Locale, type MessageKey } from './messages';

export {
  CATALOGUES,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  type Locale,
  type MessageKey,
} from './messages';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Look up one message.
 *
 * Falls back to the reference locale rather than to the key, because a French
 * speaker seeing German is a bad day and a French speaker seeing
 * `report.field.identifierHint` is a broken product. The type system makes
 * this unreachable in practice; the fallback is for data that arrived at
 * runtime, such as a locale read from a database row written by an older
 * version.
 */
export function translate(locale: Locale, key: MessageKey): string {
  return CATALOGUES[locale]?.[key] ?? CATALOGUES[DEFAULT_LOCALE][key];
}

/** A bound translator, for a component tree that already knows its locale. */
export function translator(locale: Locale): (key: MessageKey) => string {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
  return (key) => catalogue[key] ?? CATALOGUES[DEFAULT_LOCALE][key];
}

/**
 * Pick a locale from an Accept-Language header.
 *
 * Quality-ordered, and it accepts a region tag: `de-CH` must select `de`, or
 * every Swiss browser — which is to say all of them — falls through to the
 * default by accident and the feature looks like it works because the default
 * happens to be German.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2);
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag.length > 0 && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag;
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}
