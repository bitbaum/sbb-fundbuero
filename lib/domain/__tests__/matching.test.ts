/**
 * The point of these tests is not that the numbers are right. It is that the
 * ORDERING is structural — that no amount of description agreement can ever
 * reach the tier an identifier or a journey reaches.
 *
 * A weight-based matcher cannot be tested this way, which is the argument for
 * not building one.
 */

import { computeMatch, tierAtLeast, type MatchSubject } from '../matching';
import { normaliseIdentifier, parseIdentifier } from '../identifiers';

/** A Luhn-valid IMEI. Verified by hand in identifiers.test.ts. */
const IMEI = '490154203237518';

function subject(over: Partial<MatchSubject> = {}): MatchSubject {
  return {
    identifiers: [],
    journeyKey: null,
    lineKey: null,
    coach: null,
    from: null,
    to: null,
    category: 'electronics',
    descriptionTokens: [],
    colour: null,
    brand: null,
    ...over,
  };
}

describe('tier ordering is structural', () => {
  it('gives an exact strong-identifier agreement the identifier tier', () => {
    const a = subject({ identifiers: [{ kind: 'imei', value: IMEI, verified: true }] });
    const b = subject({ identifiers: [{ kind: 'imei', value: IMEI, verified: true }] });

    expect(computeMatch(a, b).tier).toBe('identifier');
  });

  it('never lets description, colour and brand exceed the weak tier', () => {
    // Everything a description-similarity matcher would call a near-certain
    // match: same category, same colour, same brand, every word in common.
    const tokens = ['black', 'leather', 'wallet', 'worn', 'corner', 'zip', 'small'];
    const a = subject({
      category: 'wallet',
      descriptionTokens: tokens,
      colour: 'black',
      brand: 'Freitag',
    });
    const b = subject({
      category: 'wallet',
      descriptionTokens: tokens,
      colour: 'black',
      brand: 'Freitag',
    });

    const result = computeMatch(a, b);

    expect(result.tier).toBe('weak');
    expect(tierAtLeast(result.tier, 'plausible')).toBe(false);
    // It still scores points — it should sort above a pair sharing nothing.
    expect(result.points).toBeGreaterThan(0);
  });

  it('ranks a description-only pair below a journey-only pair', () => {
    const descriptionOnly = computeMatch(
      subject({ descriptionTokens: ['black', 'umbrella'], colour: 'black', brand: 'Knirps' }),
      subject({ descriptionTokens: ['black', 'umbrella'], colour: 'black', brand: 'Knirps' }),
    );
    const journeyOnly = computeMatch(
      subject({ journeyKey: 'ch:1:sjyid:100058:12920-002@2026-09-08', category: 'bags' }),
      subject({ journeyKey: 'ch:1:sjyid:100058:12920-002@2026-09-08', category: 'other' }),
    );

    expect(descriptionOnly.tier).toBe('weak');
    expect(journeyOnly.tier).toBe('plausible');
  });

  it('promotes a shared journey to strong only when the category also agrees', () => {
    const journey = 'ch:1:sjyid:100058:12920-002@2026-09-08';

    expect(
      computeMatch(
        subject({ journeyKey: journey, category: 'electronics' }),
        subject({ journeyKey: journey, category: 'electronics' }),
      ).tier,
    ).toBe('strong');

    expect(
      computeMatch(
        subject({ journeyKey: journey, category: 'electronics' }),
        subject({ journeyKey: journey, category: 'clothing' }),
      ).tier,
    ).toBe('plausible');
  });

  it('treats a weak identifier kind as strong, not as proof', () => {
    const a = subject({ identifiers: [{ kind: 'iban_last4', value: '4417' }] });
    const b = subject({ identifiers: [{ kind: 'iban_last4', value: '4417' }] });

    expect(computeMatch(a, b).tier).toBe('strong');
  });

  it('cannot be pushed past weak by piling on more description', () => {
    // The property that matters: adding description signal to ANY pair leaves
    // the tier exactly where it was.
    const journey = 'ch:1:sjyid:100058:12920-002@2026-09-08';
    const bases: [MatchSubject, MatchSubject][] = [
      [subject(), subject()],
      [subject({ journeyKey: journey }), subject({ journeyKey: journey })],
      [subject({ lineKey: 'IC1@2026-09-08' }), subject({ lineKey: 'IC1@2026-09-08' })],
      [
        subject({ identifiers: [{ kind: 'imei', value: IMEI }] }),
        subject({ identifiers: [{ kind: 'imei', value: IMEI }] }),
      ],
    ];

    const noise = {
      descriptionTokens: ['black', 'small', 'worn', 'leather', 'zip', 'old', 'plain'],
      colour: 'black',
      brand: 'Freitag',
    };

    for (const [a, b] of bases) {
      const before = computeMatch(a, b).tier;
      const after = computeMatch({ ...a, ...noise }, { ...b, ...noise }).tier;
      expect(after).toBe(before);
    }
  });
});

describe('conflicts', () => {
  it('keeps the identifier tier but reports disagreeing journeys', () => {
    const a = subject({
      identifiers: [{ kind: 'imei', value: IMEI }],
      journeyKey: 'ch:1:sjyid:100058:12920-002@2026-09-08',
    });
    const b = subject({
      identifiers: [{ kind: 'imei', value: IMEI }],
      journeyKey: 'ch:1:sjyid:100058:99999-001@2026-09-08',
    });

    const result = computeMatch(a, b);

    // A matching IMEI beats a mistyped train number — but a human sees why.
    expect(result.tier).toBe('identifier');
    expect(result.conflicts.join(' ')).toMatch(/different journeys/);
  });

  it('flags a find that predates the loss window', () => {
    const a = subject({ from: '2026-09-08T14:00:00Z', to: '2026-09-08T14:30:00Z' });
    const b = subject({ from: '2026-09-08T09:00:00Z', to: '2026-09-08T09:05:00Z' });

    expect(computeMatch(a, b).conflicts.join(' ')).toMatch(/time windows/);
  });

  it('does not flag a find minutes after the loss window', () => {
    const a = subject({ from: '2026-09-08T14:00:00Z', to: '2026-09-08T14:30:00Z' });
    const b = subject({ from: '2026-09-08T14:35:00Z', to: '2026-09-08T14:40:00Z' });

    expect(computeMatch(a, b).conflicts).toHaveLength(0);
  });
});

describe('breakdown', () => {
  it('reports every signal that contributed, so a human can audit the link', () => {
    const journey = 'ch:1:sjyid:100058:12920-002@2026-09-08';
    const result = computeMatch(
      subject({
        identifiers: [{ kind: 'imei', value: IMEI, verified: true }],
        journeyKey: journey,
        coach: '7',
        from: '2026-09-08T14:00:00Z',
        to: '2026-09-08T14:30:00Z',
        descriptionTokens: ['schwarz', 'handy'],
        colour: 'black',
      }),
      subject({
        identifiers: [{ kind: 'imei', value: IMEI, verified: true }],
        journeyKey: journey,
        coach: '7',
        from: '2026-09-08T14:20:00Z',
        to: '2026-09-08T14:25:00Z',
        descriptionTokens: ['schwarz', 'handy'],
        colour: 'black',
      }),
    );

    const signals = result.breakdown.map((c) => c.signal);
    expect(signals).toEqual(
      expect.arrayContaining(['identifier', 'journey', 'coach', 'time', 'category', 'description']),
    );
    // Points must add up to what is reported — the breakdown is the score, not
    // a story told alongside it.
    expect(result.points).toBe(result.breakdown.reduce((s, c) => s + c.points, 0));
  });

  it('scores nothing and claims nothing when the two share nothing', () => {
    const result = computeMatch(
      subject({ category: 'electronics' }),
      subject({ category: 'clothing' }),
    );

    expect(result.tier).toBe('none');
    expect(result.points).toBe(0);
  });
});

describe('normalisation feeds matching', () => {
  it('matches an IMEI typed with spaces against one typed without', () => {
    const typed = parseIdentifier('imei', '49 015420 323751 8');
    const scanned = parseIdentifier('imei', IMEI);

    expect(typed).not.toBeNull();
    expect(scanned).not.toBeNull();

    expect(
      computeMatch(subject({ identifiers: [typed!] }), subject({ identifiers: [scanned!] })).tier,
    ).toBe('identifier');
  });

  it('matches a Swiss plate written with and without spacing', () => {
    expect(normaliseIdentifier('registration', 'ZH 123 456')).toBe(
      normaliseIdentifier('registration', 'zh123456'),
    );
  });
});
