/**
 * AGENTS.md rule 1 — "never state a number without a citable source" — as a test.
 *
 * Three fabricated statistics survived in the README for months because the
 * rule lived only in a document. A rule enforced by whoever writes the next
 * paragraph is not enforced. These assertions run in `pnpm run verify`.
 *
 * The ones that matter most are in the last block: a claim may not quietly
 * become a fact by losing its `assumption` label. That is precisely how
 * "report within 30 minutes → >70% recovery" came to be repeated as though it
 * had been measured.
 *
 * Those content guards resolve claims through ALL FOUR catalogues rather than
 * reading an English field, because the claim a reader sees is the translated
 * one. A guard that inspected only the reference locale would let the banned
 * number back in through the French copy — the one nobody rereads.
 */
import { CATALOGUES, LOCALES } from '../i18n';
import { EVIDENCE, EVIDENCE_BY_ID, assumptions, citableEvidence, sources } from '../research';
import type { Evidence } from '../research';

/** Every rendered form of an entry's claim and limit, across all locales. */
function rendered(entries: readonly Evidence[]): string {
  return entries
    .flatMap((e) =>
      LOCALES.flatMap((l) => [CATALOGUES[l][e.claim], e.limit ? CATALOGUES[l][e.limit] : '']),
    )
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

describe('the evidence base', () => {
  it('gives every claim a stable, unique id', () => {
    const ids = EVIDENCE.map((e) => e.id);
    expect(ids).toEqual([...new Set(ids)]);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it.each(EVIDENCE.filter((e) => e.kind !== 'assumption').map((e) => [e.id, e] as const))(
    'cites a real source for %s',
    (_id, e) => {
      expect(e.source).toBeDefined();
      expect(e.source!.url).toMatch(/^https:\/\//);
      expect(e.source!.publisher.length).toBeGreaterThan(0);
      expect(e.source!.title.length).toBeGreaterThan(0);
    },
  );

  it('never attaches a source to an assumption — that would read as evidence', () => {
    for (const e of assumptions()) expect(e.source).toBeUndefined();
  });

  it('makes every assumption say what it is not', () => {
    // An assumption without a stated limit is indistinguishable, on the page,
    // from a finding. The limit is the label — in every language.
    for (const e of assumptions()) {
      expect(e.limit).toBeDefined();
      for (const locale of LOCALES) {
        expect(CATALOGUES[locale][e.limit!].length).toBeGreaterThan(20);
      }
    }
  });

  it('carries no bare number that is not attributable', () => {
    for (const e of EVIDENCE) {
      if (!e.value) continue;
      expect(e.kind).not.toBe('assumption');
      expect(e.source).toBeDefined();
    }
  });

  it('keeps words out of the value field', () => {
    // `value` renders untranslated, so an English word baked into it — as
    // "~180,000 reported / ~120,000 found" once was — reaches a French reader
    // with no catalogue able to touch it. Digits, separators and units only.
    for (const e of EVIDENCE) {
      if (!e.value) continue;
      expect(e.value).not.toMatch(/[A-Za-z]{2,}/);
    }
  });

  it('separates citable claims from assumptions exhaustively', () => {
    expect(citableEvidence().length + assumptions().length).toBe(EVIDENCE.length);
    expect(citableEvidence().some((e) => e.kind === 'assumption')).toBe(false);
  });

  it('deduplicates sources for a bibliography', () => {
    const urls = sources().map((s) => s.url);
    expect(urls).toEqual([...new Set(urls)]);
    // Cohn et al. backs five separate claims and must appear once.
    expect(urls.filter((u) => u.includes('science.org')).length).toBe(1);
  });

  it('indexes by id', () => {
    expect(EVIDENCE_BY_ID['wallet-channel']?.kind).toBe('published');
    expect(EVIDENCE_BY_ID['nope']).toBeUndefined();
  });

  it('translates every claim into all four languages', () => {
    // `MessageKey` already makes an untranslated key a compile error. This
    // catches the other half: a key that exists everywhere because someone
    // copied the German sentence into the other three catalogues unchanged.
    for (const e of EVIDENCE) {
      const de = CATALOGUES.de[e.claim];
      for (const locale of LOCALES) {
        const text = CATALOGUES[locale][e.claim];
        expect(text.length).toBeGreaterThan(10);
        if (locale !== 'de') expect(text).not.toBe(de);
      }
    }
  });

  describe('the claims the product must not lose', () => {
    it('keeps the 30-minute claim OUT of the citable set, in every language', () => {
      // It has no traceable source. If a future edit adds it as `published`,
      // this is what should stop the commit — and it reads the translations,
      // because the number could return through any one of them.
      const citable = rendered(citableEvidence());
      expect(citable).not.toMatch(/30 minut/);
      expect(citable).not.toMatch(/70\s*%/);
    });

    it('keeps the time-window claim labelled an assumption', () => {
      const tw = EVIDENCE_BY_ID['time-window'];
      expect(tw).toBeDefined();
      expect(tw.kind).toBe('assumption');
      // Each language states the negation in its own words, and all four put
      // it in capitals — the only form that survives a skim.
      expect(CATALOGUES.de[tw.limit!]).toMatch(/NICHT gemessen/);
      expect(CATALOGUES.en[tw.limit!]).toMatch(/NOT measured/);
      expect(CATALOGUES.fr[tw.limit!]).toMatch(/NON mesuré/);
      expect(CATALOGUES.it[tw.limit!]).toMatch(/NON misurato/);
    });

    it('keeps the wallet study’s contact channel on the record, in every language', () => {
      // Drop this detail and the study reads as "people are honest", which is
      // not what it shows and not what this product rests on.
      const wc = EVIDENCE_BY_ID['wallet-channel'];
      expect(wc?.source?.url).toContain('science.org');
      for (const locale of LOCALES) {
        expect(CATALOGUES[locale][wc.claim].toLowerCase()).toMatch(/e-?mail/);
      }
    });
  });
});
