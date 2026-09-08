/**
 * Identifiers — the first and strongest matching signal.
 *
 * An identifier is something about an object that is nearly unique and that a
 * stranger cannot guess: an IMEI, a serial number, an engraving, a bicycle
 * registration. It is the difference between "a black umbrella" and "this
 * umbrella".
 *
 * Why this table exists at all is the formal result from record linkage: the
 * weight of an agreement between two records is a function of how RARE the
 * agreeing value is (Fellegi & Sunter 1969, JASA 64(328):1183-1210). Two
 * records agreeing on "black" carries almost no information because almost
 * everything is black; two records agreeing on a 15-digit IMEI carries almost
 * all of it. That is not a heuristic, it is the arithmetic of the problem.
 *
 * Pure. No database, no I/O, no framework.
 */

export const IDENTIFIER_KINDS = [
  'imei',
  'serial',
  'registration',
  'engraving',
  'iban_last4',
  'other',
] as const;

export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number];

/**
 * Kinds whose value space is large enough, and whose values are unguessable
 * enough, that an exact agreement is near-proof of identity on its own.
 *
 * `engraving` is deliberately NOT here even though it feels specific: "Anna"
 * on the inside of a ring is common, and unlike an IMEI it is visible to
 * whoever is holding the object — so it cannot distinguish an owner from a
 * finder. `iban_last4` is 4 digits: one in ten thousand, which is a strong
 * hint next to a matching journey and nothing like proof on its own.
 */
export const STRONG_IDENTIFIER_KINDS: readonly IdentifierKind[] = [
  'imei',
  'serial',
  'registration',
];

export function isStrongKind(kind: IdentifierKind): boolean {
  return STRONG_IDENTIFIER_KINDS.includes(kind);
}

export interface Identifier {
  kind: IdentifierKind;
  /** Comparison form. Always compare these, never the display form. */
  value: string;
  /**
   * True when someone or something checked that this value belongs to this
   * object — a staff member reading it off the device, or a checksum the value
   * had to satisfy. An unverified identifier still matches; it just cannot be
   * the sole basis for handing property to a stranger.
   */
  verified?: boolean;
}

/**
 * Fold a human-typed value into its comparison form.
 *
 * People type IMEIs with spaces, serials with mixed case, plates with and
 * without dashes. Two records that agree in substance must produce the same
 * string here or the strongest signal in the system silently fails to fire.
 */
export function normaliseIdentifier(kind: IdentifierKind, raw: string): string {
  const trimmed = raw.trim();

  switch (kind) {
    case 'imei':
      // Digits only. An IMEI is 15 decimal digits; anything else a phone shows
      // (dashes, the "/01" software-version suffix) is presentation.
      return trimmed.replace(/\D/g, '');

    case 'iban_last4':
      return trimmed.replace(/\D/g, '').slice(-4);

    case 'serial':
    case 'registration':
      // Alphanumeric, upper case. Swiss plates print as "ZH 123 456"; the
      // spaces and the case are not part of the identity.
      return trimmed.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();

    case 'engraving':
    case 'other':
      // Free text: collapse whitespace and case, but keep everything else. An
      // engraving's punctuation can be the distinguishing part.
      return trimmed.replace(/\s+/g, ' ').toLocaleLowerCase();
  }
}

/**
 * Does this value satisfy the structural rules of its kind?
 *
 * This is not "is it true", it is "could it be true". A 15-digit string that
 * fails the Luhn check is not a typo-tolerant near-miss, it is not an IMEI —
 * so we can mark an IMEI verified without asking anybody, which is the only
 * kind here that verifies itself.
 */
export function isWellFormed(kind: IdentifierKind, value: string): boolean {
  switch (kind) {
    case 'imei':
      return value.length === 15 && luhnValid(value);
    case 'iban_last4':
      return /^\d{4}$/.test(value);
    case 'serial':
    case 'registration':
      return value.length >= 3;
    case 'engraving':
    case 'other':
      return value.length >= 2;
  }
}

/**
 * Luhn checksum, as used by IMEI (and card numbers).
 *
 * Double every second digit from the right, subtract 9 from any result above
 * 9, and the total must be divisible by 10.
 */
export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;

  let sum = 0;
  let double = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }

  return sum % 10 === 0;
}

/**
 * Parse and normalise an identifier, rejecting values that cannot be what they
 * claim to be. Returns null rather than throwing: a passenger mistyping an
 * IMEI on a moving train is expected input, not an exception.
 */
export function parseIdentifier(kind: IdentifierKind, raw: string): Identifier | null {
  const value = normaliseIdentifier(kind, raw);
  if (!isWellFormed(kind, value)) return null;

  return {
    kind,
    value,
    // Only the IMEI carries its own proof. Everything else needs a human.
    verified: kind === 'imei',
  };
}

/**
 * Identifier agreements between two sets, strongest kind first.
 *
 * Both sides must already be normalised — comparing a raw value against a
 * normalised one is the failure mode this whole module exists to prevent.
 */
export function agreements(a: readonly Identifier[], b: readonly Identifier[]): Identifier[] {
  const index = new Map<string, Identifier>();
  for (const id of b) index.set(`${id.kind}:${id.value}`, id);

  const hits: Identifier[] = [];
  for (const id of a) {
    const other = index.get(`${id.kind}:${id.value}`);
    if (other) {
      hits.push({ kind: id.kind, value: id.value, verified: !!id.verified && !!other.verified });
    }
  }

  return hits.sort((x, y) => Number(isStrongKind(y.kind)) - Number(isStrongKind(x.kind)));
}
