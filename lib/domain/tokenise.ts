/**
 * Turning a free-text description into comparable tokens.
 *
 * This lives outside matching.ts on purpose: matching must not know what
 * language anything is in, and tokenisation must not know what a match is.
 *
 * Two traps this file exists to avoid:
 *
 * 1. `\w` and `\b` are ASCII in JavaScript regular expressions. Splitting on
 *    `\W+` cuts "Schlüssel" into "schl" and "ssel", and "Portemonnaie" survives
 *    only because it happens to have no accents. Every split here uses
 *    Unicode property escapes with the `u` flag, so "Schlüssel", "français"
 *    and "occhiali" stay whole.
 *
 * 2. A stopword list with a hole makes correct text look foreign. If "der" is
 *    dropped for German but "il" is kept for Italian, an Italian description
 *    scores higher purely because its function words were left in. So the list
 *    is applied for ALL FOUR languages at once, regardless of which language
 *    the text is in — we do not know the language of a description, and
 *    guessing it wrong is worse than over-removing a few words.
 */

/**
 * Function words in de, fr, it and en, applied as one set.
 *
 * Deliberately short. This removes words that carry no information about an
 * OBJECT; it is not a linguistic stopword list and should not grow into one.
 * Anything removed here can never contribute to a match, so the cost of
 * over-removal is real.
 */
const STOPWORDS = new Set([
  // de
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einen',
  'einem',
  'einer',
  'eines',
  'und',
  'oder',
  'mit',
  'ohne',
  'von',
  'vom',
  'zum',
  'zur',
  'auf',
  'aus',
  'bei',
  'für',
  'ist',
  'war',
  'habe',
  'hab',
  'hatte',
  'ich',
  'mein',
  'meine',
  'meinen',
  'meinem',
  'sich',
  'sehr',
  // fr
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'au',
  'aux',
  'et',
  'ou',
  'avec',
  'sans',
  'dans',
  'sur',
  'pour',
  'est',
  'mon',
  'ma',
  'mes',
  'je',
  'il',
  'elle',
  'ce',
  'cette',
  'ces',
  // it
  'il',
  'lo',
  'gli',
  'un',
  'uno',
  'una',
  'del',
  'della',
  'dei',
  'delle',
  'con',
  'senza',
  'da',
  'in',
  'su',
  'per',
  'che',
  'mio',
  'mia',
  'miei',
  'sono',
  'era',
  'questo',
  'questa',
  // en
  'the',
  'a',
  'an',
  'and',
  'or',
  'with',
  'without',
  'of',
  'from',
  'to',
  'in',
  'on',
  'at',
  'for',
  'is',
  'was',
  'my',
  'i',
  'it',
  'this',
  'that',
  'have',
  'had',
  // domain noise: every description says these
  'verloren',
  'vergessen',
  'liegen',
  'gelassen',
  'lost',
  'left',
  'forgot',
  'perdu',
  'oublié',
  'perso',
  'dimenticato',
  'zug',
  'train',
  'tram',
  'bus',
]);

/** Below this, a token is noise: "cm", "nr", "ca". */
const MIN_TOKEN_LENGTH = 3;

/**
 * Split on anything that is not a letter, a digit or an intra-word mark.
 *
 * Apostrophes and hyphens are kept INSIDE words ("l'écharpe" stays one token
 * rather than becoming "l" and "écharpe"), then stripped at the edges.
 */
const SPLIT = /[^\p{L}\p{N}'’-]+/u;
const EDGE_MARKS = /^['’-]+|['’-]+$/gu;

export function tokenise(text: string): string[] {
  if (!text) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of text.split(SPLIT)) {
    const token = raw.replace(EDGE_MARKS, '').toLocaleLowerCase('de-CH');

    if (token.length < MIN_TOKEN_LENGTH) continue;
    if (STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;

    seen.add(token);
    out.push(token);
  }

  return out;
}

/**
 * Numbers that look like they might identify something — a serial fragment, a
 * seat, a coach — pulled out separately so a caller can offer them back to the
 * user as candidate identifiers instead of burying them in description tokens.
 *
 * This does not decide that they ARE identifiers. A person confirms that; the
 * whole point of the identifier table is that its contents were asserted, not
 * inferred.
 */
export function candidateIdentifierFragments(text: string): string[] {
  const out = new Set<string>();

  for (const m of text.matchAll(/[\p{L}]*\d[\p{L}\d-]*/gu)) {
    const token = m[0].replace(EDGE_MARKS, '');
    // Four or more characters, and containing at least two digits: "7" is a
    // coach, "A42" is a seat, "C02XY1234" might be a serial.
    if (token.length >= 4 && (token.match(/\d/g) ?? []).length >= 2) {
      out.add(token.toUpperCase());
    }
  }

  return [...out];
}
