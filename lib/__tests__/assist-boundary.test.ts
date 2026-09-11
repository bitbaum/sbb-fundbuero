/**
 * Two boundaries the report assistant must not cross, and one the language
 * switcher must not.
 *
 * The assistant turns a sentence someone typed into filled-in form fields.
 * That is model output reaching application state, which makes the list of
 * fields it may write a security boundary rather than a convenience. Two
 * entries on that list would be actively harmful:
 *
 *   `journeyId` / `stationId` — AGENTS.md rule 3 says a description must never
 *   outrank an identifier or a trip match. A model reading "the IC 8 from
 *   Bern" and writing a journey id IS that failure: a specific, confident,
 *   unverifiable trip that the matcher then weights above everything else.
 *
 *   `email` / `phone` — AGENTS.md rules 4 and 5 keep personal data out of
 *   places it can leak. A misread journey costs a search. A misread phone
 *   number sends someone's recovery notice to a stranger.
 *
 * These are asserted as ABSENCE, which is the kind of test that rots quietly:
 * rename a field and the assertion passes by checking nothing. So the positive
 * half is asserted too — the fields that SHOULD be fillable are, and the draft
 * really does still have the forbidden ones.
 */
import { emptyDraft } from '../report-flow';
import { REPORT_ASSIST_FIELD_NAMES, REPORT_ASSIST_FIELDS } from '../server/assist-fields';
import { isSafeNextPath } from '../i18n/server';
import { AREAS, CATEGORIES } from '../report-options';

const FORBIDDEN = ['journeyId', 'stationId', 'journeyUnknown', 'email', 'phone', 'at'] as const;

describe('what a free-text description may fill in', () => {
  it('fills the fields it is meant to', () => {
    // The absence assertions below are only meaningful if the list is real.
    for (const name of ['category', 'description', 'colour', 'coach', 'seat', 'area']) {
      expect(REPORT_ASSIST_FIELD_NAMES).toContain(name);
    }
  });

  it.each(FORBIDDEN)('never lets the model write %s', (name) => {
    expect(REPORT_ASSIST_FIELD_NAMES).not.toContain(name);
  });

  it('still has those fields on the draft (guards against a rename passing vacuously)', () => {
    // If `email` were renamed, the assertion above would pass because nothing
    // is called `email` any more — not because the boundary held.
    const draft = emptyDraft(new Date('2026-09-11T08:00:00Z')) as unknown as Record<
      string,
      unknown
    >;
    for (const name of FORBIDDEN) expect(Object.keys(draft)).toContain(name);
  });

  it('constrains the closed sets to their real vocabularies', () => {
    // A `select` whose options drifted from CATEGORIES would let the model
    // return a value `lib/server/validation.ts` then rejects — the passenger
    // sees their own report refused for a word they never typed.
    const category = REPORT_ASSIST_FIELDS.find((f) => f.name === 'category');
    const area = REPORT_ASSIST_FIELDS.find((f) => f.name === 'area');

    expect(category?.options?.map((o) => o.value)).toEqual([...CATEGORIES]);
    expect(area?.options?.map((o) => o.value)).toEqual([...AREAS]);
  });

  it('asks for a relative time, not a timestamp', () => {
    // "Just before eight this morning" needs the reader's timezone and today's
    // date to become an instant. A number of minutes needs neither, and the
    // conversion reuses `offsetToIso`, which the quick-offset buttons already
    // use and the flow tests already cover.
    const minutes = REPORT_ASSIST_FIELDS.find((f) => f.name === 'minutesAgo');
    expect(minutes?.type).toBe('number');
    expect(minutes?.max).toBe(1440);
  });
});

describe('the language switcher’s return path', () => {
  // `next` is echoed into a Location header, so it is an open redirect unless
  // it is checked — and "starts with a slash" is NOT the check.
  it.each(['/', '/research', '/how-it-works', '/app', '/research?x=1', '/a/b/c'])(
    'accepts the same-origin path %s',
    (path) => {
      expect(isSafeNextPath(path)).toBe(true);
    },
  );

  it.each([
    '//evil.example',
    '//evil.example/path',
    '/\\evil.example',
    'https://evil.example',
    'http://evil.example',
    '//',
    'research',
    '',
    'javascript:alert(1)',
  ])('refuses %s', (path) => {
    expect(isSafeNextPath(path)).toBe(false);
  });

  it('refuses a missing value', () => {
    expect(isSafeNextPath(null)).toBe(false);
  });
});
