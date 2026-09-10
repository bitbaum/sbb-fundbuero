import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CATALOGUES,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  isLocale,
  localeFromAcceptLanguage,
  translate,
  translator,
  type Locale,
  type MessageKey,
} from '..';

describe('every locale is complete', () => {
  const reference = Object.keys(CATALOGUES[DEFAULT_LOCALE]) as MessageKey[];

  it('has all four Swiss-relevant languages', () => {
    expect([...LOCALES].sort()).toEqual(['de', 'en', 'fr', 'it']);
  });

  it.each(LOCALES)('%s has every key the reference locale has', (locale) => {
    // The types already make this a compile error. The test exists because a
    // catalogue can also drift by having a key with an EMPTY string, which
    // typechecks perfectly and renders as nothing.
    const keys = Object.keys(CATALOGUES[locale]).sort();
    expect(keys).toEqual([...reference].sort());
  });

  it.each(LOCALES)('%s has no empty or placeholder strings', (locale) => {
    for (const [key, value] of Object.entries(CATALOGUES[locale])) {
      expect(value.trim().length).toBeGreaterThan(0);
      expect(value).not.toMatch(/^TODO|^FIXME|^\?\?/);
    }
  });

  it('does not leave a non-German locale identical to German throughout', () => {
    // The failure this catches: a catalogue copied from German and never
    // translated. It typechecks, every key is present, nothing is empty — and
    // a French speaker gets German.
    for (const locale of LOCALES.filter((l) => l !== 'de')) {
      const identical = (Object.keys(CATALOGUES.de) as MessageKey[]).filter(
        (key) => CATALOGUES[locale][key] === CATALOGUES.de[key],
      );
      // Some overlap is legitimate ("E-Mail" is "E-Mail"), so this asserts the
      // catalogue was actually translated, not that no string may coincide.
      expect(identical.length).toBeLessThan(reference.length * 0.2);
    }
  });

  it('names each language in its own language', () => {
    // A picker that says "German" to a French speaker is for us, not them.
    expect(LOCALE_NAMES.de).toBe('Deutsch');
    expect(LOCALE_NAMES.fr).toBe('Français');
    expect(LOCALE_NAMES.it).toBe('Italiano');
  });
});

describe('lookup', () => {
  it('returns the string for the asked-for locale', () => {
    expect(translate('fr', 'nav.report')).toBe('Signaler');
    expect(translate('it', 'nav.report')).toBe('Segnala');
  });

  it('falls back to the reference locale for an unknown one at runtime', () => {
    // Unreachable through the types; possible from a database row written by
    // an older version. German is a worse answer than French, and a far
    // better one than rendering the key.
    expect(translate('rm' as Locale, 'nav.report')).toBe(CATALOGUES.de['nav.report']);
  });

  it('never returns the key itself', () => {
    for (const locale of LOCALES) {
      const t = translator(locale);
      for (const key of Object.keys(CATALOGUES.de) as MessageKey[]) {
        expect(t(key)).not.toBe(key);
      }
    }
  });
});

describe('Accept-Language', () => {
  it('selects de for a Swiss German browser', () => {
    // de-CH must resolve to de. Every Swiss browser sends a region tag, so
    // getting this wrong sends all of them to the default — and the default
    // is German, so it would look like it worked.
    expect(localeFromAcceptLanguage('de-CH,de;q=0.9,en;q=0.8')).toBe('de');
  });

  it('respects quality ordering rather than document order', () => {
    expect(localeFromAcceptLanguage('en;q=0.2,fr;q=0.9')).toBe('fr');
  });

  it('handles the Romand and Ticino cases', () => {
    expect(localeFromAcceptLanguage('fr-CH,fr;q=0.9')).toBe('fr');
    expect(localeFromAcceptLanguage('it-CH,it;q=0.9')).toBe('it');
  });

  it('falls back for a language we do not have', () => {
    // Romansh is Switzerland's fourth national language and this product does
    // not have it. That is a gap, not a crash.
    expect(localeFromAcceptLanguage('rm-CH,rm')).toBe(DEFAULT_LOCALE);
  });

  it('falls back for nothing at all', () => {
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage('')).toBe(DEFAULT_LOCALE);
  });

  it('does not crash on a malformed header', () => {
    expect(() => localeFromAcceptLanguage(',,;q=,de')).not.toThrow();
    expect(localeFromAcceptLanguage(',,;q=,de')).toBe('de');
  });
});

describe('isLocale', () => {
  it('accepts the four and rejects everything else', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('rm')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe('no hardcoded UI strings in components', () => {
  /**
   * The rule this enforces is "no string in a component, ever". A component
   * that renders a literal cannot be translated, and the failure is invisible
   * in German — which is the locale everyone here develops in.
   */
  function tsxFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...tsxFiles(path));
      else if (entry.name.endsWith('.tsx')) out.push(path);
    }
    return out;
  }

  /**
   * A RATCHET, not a wish. It was 8; the UI rewrite brought it to 1.
   *
   * The one left is app/opengraph-image.tsx, which renders a social preview
   * IMAGE rather than UI: it is generated without a request locale, so it
   * carries the tenant's language by design. Everything a passenger or crew
   * member actually reads comes from lib/i18n.
   *
   * Asserting zero would mean either deleting the check or special-casing that
   * file, and a check with an exception list rots into a list. One is the
   * honest number.
   */
  const LITERAL_PROSE_BASELINE = 1;

  it('finds the component tree at all', () => {
    // Guards the guard: with a wrong path this suite passes vacuously and the
    // ratchet silently protects nothing.
    // Low thresholds on purpose: this exists to catch a WRONG PATH (which
    // would make the ratchet pass vacuously), not to assert a file count.
    expect(tsxFiles(join(process.cwd(), 'components')).length).toBeGreaterThan(1);
    expect(tsxFiles(join(process.cwd(), 'app')).length).toBeGreaterThan(1);
  });

  it('does not add a component holding literal prose', () => {
    const offenders: string[] = [];

    for (const file of [
      ...tsxFiles(join(process.cwd(), 'components')),
      ...tsxFiles(join(process.cwd(), 'app')),
    ]) {
      const source = readFileSync(file, 'utf8');
      // Prose between JSX tags: >Some words< — two or more letters plus a
      // space. Code punctuation is excluded, because without it a TypeScript
      // generic reads as prose: `useState<Report[]>(null);\n  const [x] =
      // useState<` spans a `>` … `<` pair containing words and a space, and
      // the check flagged two components that had no literal text at all.
      // A check that fires on clean files is one people learn to ignore.
      if (/>[^<>{}();=[\]]*[A-Za-zÄÖÜäöü]{2,}[^<>{}();=[\]]*\s[^<>{}();=[\]]*</.test(source)) {
        offenders.push(file.replace(process.cwd() + '/', ''));
      }
    }

    // The line being held. Naming the files matters more than the count: a
    // bare "9 > 8" sends the next person hunting, and they will skip the test
    // instead.
    if (offenders.length > LITERAL_PROSE_BASELINE) {
      throw new Error(
        `${offenders.length} components hold literal prose (baseline ${LITERAL_PROSE_BASELINE}).\n` +
          `Move the text into lib/i18n/messages.ts:\n  ${offenders.join('\n  ')}`,
      );
    }
    expect(offenders.length).toBeLessThanOrEqual(LITERAL_PROSE_BASELINE);
  });
});
