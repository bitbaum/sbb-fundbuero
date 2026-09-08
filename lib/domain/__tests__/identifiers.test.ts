import {
  IDENTIFIER_KINDS,
  agreements,
  isStrongKind,
  isWellFormed,
  luhnValid,
  normaliseIdentifier,
  parseIdentifier,
  type Identifier,
} from '../identifiers';

/**
 * 490154203237518 is the standard example IMEI. Its Luhn sum is 60, which is
 * divisible by 10 — worked through by hand rather than taken on trust, because
 * a checksum test seeded with a value the implementation produced would pass
 * for any implementation.
 */
const VALID_IMEI = '490154203237518';
const BAD_CHECK_DIGIT = '490154203237519';

describe('luhn', () => {
  it('accepts a valid IMEI', () => {
    expect(luhnValid(VALID_IMEI)).toBe(true);
  });

  it('rejects the same IMEI with the check digit off by one', () => {
    expect(luhnValid(BAD_CHECK_DIGIT)).toBe(false);
  });

  it('rejects a transposition, which is the typo people actually make', () => {
    // 15 -> 51 in the middle of the number.
    expect(luhnValid('490154203237518'.replace('54', '45'))).toBe(false);
  });

  it('rejects anything that is not all digits', () => {
    expect(luhnValid('49015420323751X')).toBe(false);
    // Empty is not "trivially valid because the sum is 0" — it is not a number.
    expect(luhnValid('')).toBe(false);
  });
});

describe('normalisation', () => {
  it('strips the punctuation people type into an IMEI', () => {
    expect(normaliseIdentifier('imei', '49-015420 323751/8')).toBe(VALID_IMEI);
  });

  it('folds case and spacing in a registration', () => {
    expect(normaliseIdentifier('registration', 'zh 123 456')).toBe('ZH123456');
    expect(normaliseIdentifier('registration', 'ZH-123-456')).toBe('ZH123456');
  });

  it('keeps only the last four digits of an IBAN fragment', () => {
    expect(normaliseIdentifier('iban_last4', 'CH93 0076 2011 6238 5295 7')).toBe('2957');
    expect(normaliseIdentifier('iban_last4', '4417')).toBe('4417');
  });

  it('preserves punctuation in an engraving but folds case and spacing', () => {
    // "J.M. — 1987" and "j.m. — 1987" are the same engraving; the dot is not
    // noise, it is part of what makes the engraving distinctive.
    expect(normaliseIdentifier('engraving', '  J.M.  — 1987 ')).toBe('j.m. — 1987');
  });

  it('is idempotent for every kind', () => {
    const samples: Record<string, string> = {
      imei: '49-015420 323751/8',
      serial: 'c02-xy 12 34',
      registration: 'zh 123 456',
      engraving: '  Für  Anna ',
      iban_last4: 'CH93 0076 2011 6238 5295 7',
      other: '  some   thing ',
    };
    for (const kind of IDENTIFIER_KINDS) {
      const once = normaliseIdentifier(kind, samples[kind]);
      expect(normaliseIdentifier(kind, once)).toBe(once);
    }
  });
});

describe('well-formedness', () => {
  it('accepts a 15-digit IMEI that passes Luhn and rejects one that does not', () => {
    expect(isWellFormed('imei', VALID_IMEI)).toBe(true);
    expect(isWellFormed('imei', BAD_CHECK_DIGIT)).toBe(false);
  });

  it('rejects an IMEI of the wrong length even if it would pass Luhn', () => {
    expect(isWellFormed('imei', '0')).toBe(false);
  });

  it('requires four digits for an IBAN fragment', () => {
    expect(isWellFormed('iban_last4', '4417')).toBe(true);
    expect(isWellFormed('iban_last4', '441')).toBe(false);
  });
});

describe('parseIdentifier', () => {
  it('marks a valid IMEI verified, because it verifies itself', () => {
    const id = parseIdentifier('imei', '49 015420 323751 8');
    expect(id).toEqual({ kind: 'imei', value: VALID_IMEI, verified: true });
  });

  it('returns null rather than throwing on a mistyped IMEI', () => {
    // A passenger mistyping on a moving train is expected input.
    expect(parseIdentifier('imei', BAD_CHECK_DIGIT)).toBeNull();
  });

  it('does not mark anything else verified — those need a human', () => {
    expect(parseIdentifier('serial', 'C02XY1234')?.verified).toBe(false);
    expect(parseIdentifier('engraving', 'für Anna')?.verified).toBe(false);
  });
});

describe('strong kinds', () => {
  it('treats IMEI, serial and registration as strong', () => {
    expect(isStrongKind('imei')).toBe(true);
    expect(isStrongKind('serial')).toBe(true);
    expect(isStrongKind('registration')).toBe(true);
  });

  it('does NOT treat an engraving as strong', () => {
    // An engraving is visible to whoever is holding the object, so it cannot
    // distinguish an owner from a finder — which is the only job that matters
    // when someone is claiming property.
    expect(isStrongKind('engraving')).toBe(false);
  });

  it('does NOT treat four IBAN digits as strong', () => {
    // One in ten thousand. A strong hint beside a matching journey; nothing
    // like proof on its own.
    expect(isStrongKind('iban_last4')).toBe(false);
  });
});

describe('agreements', () => {
  const imei: Identifier = { kind: 'imei', value: VALID_IMEI, verified: true };
  const iban: Identifier = { kind: 'iban_last4', value: '4417' };

  it('finds only exact agreements of the same kind', () => {
    expect(agreements([imei], [imei])).toHaveLength(1);
    expect(agreements([imei], [{ ...imei, value: BAD_CHECK_DIGIT }])).toHaveLength(0);
    // Same digits, different kind — not an agreement.
    expect(agreements([iban], [{ kind: 'other', value: '4417' }])).toHaveLength(0);
  });

  it('returns strong kinds first, so the caller can stop at the best one', () => {
    const hits = agreements([iban, imei], [imei, iban]);
    expect(hits.map((h) => h.kind)).toEqual(['imei', 'iban_last4']);
  });

  it('only calls an agreement verified when BOTH sides were verified', () => {
    const [hit] = agreements([imei], [{ ...imei, verified: false }]);
    expect(hit.verified).toBe(false);
  });
});
