/**
 * AGENTS.md rule 1 — "never state a number without a citable source" — as a test.
 *
 * Three fabricated statistics survived in the README for months because the
 * rule lived only in a document. A rule enforced by whoever writes the next
 * paragraph is not enforced. These assertions run in `pnpm run verify`.
 *
 * The one that matters most is the LAST one: a claim may not quietly become
 * a fact by losing its `assumption` label. That is precisely how "report
 * within 30 minutes → >70% recovery" came to be repeated as though measured.
 */
import { EVIDENCE, EVIDENCE_BY_ID, assumptions, citableEvidence, sources } from '../research';

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
    // from a finding. The limit is the label.
    for (const e of assumptions()) {
      expect(e.limit).toBeDefined();
      expect(e.limit!.length).toBeGreaterThan(20);
    }
  });

  it('carries no bare number that is not attributable', () => {
    for (const e of EVIDENCE) {
      if (!e.value) continue;
      expect(e.kind).not.toBe('assumption');
      expect(e.source).toBeDefined();
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

  describe('the claims the product must not lose', () => {
    it('keeps the 30-minute claim OUT of the citable set', () => {
      // It has no traceable source. If a future edit adds it as `published`,
      // the first assertion here is what should stop the commit.
      const citable = citableEvidence()
        .map((e) => `${e.claim} ${e.value ?? ''}`)
        .join(' ')
        .toLowerCase();
      expect(citable).not.toMatch(/30 minutes/);
      expect(citable).not.toMatch(/70\s*%/);
    });

    it('keeps the time-window claim labelled an assumption', () => {
      const tw = EVIDENCE_BY_ID['time-window'];
      expect(tw).toBeDefined();
      expect(tw.kind).toBe('assumption');
      expect(tw.limit).toMatch(/NOT measured/i);
    });

    it('keeps the wallet study’s contact channel on the record', () => {
      // Drop this detail and the study reads as "people are honest", which is
      // not what it shows and not what this product rests on.
      const wc = EVIDENCE_BY_ID['wallet-channel'];
      expect(wc?.claim.toLowerCase()).toMatch(/email|channel/);
      expect(wc?.source?.url).toContain('science.org');
    });
  });
});
