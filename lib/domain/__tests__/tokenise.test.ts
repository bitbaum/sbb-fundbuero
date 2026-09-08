import { candidateIdentifierFragments, tokenise } from '../tokenise';

describe('tokenise keeps non-ASCII words whole', () => {
  it('does not cut a German word at its umlaut', () => {
    // `\W+` would split this into "schl" and "ssel". Switzerland is not an
    // ASCII country and a matcher that quietly mangles every second German
    // noun is worse than one that does no description matching at all.
    expect(tokenise('Schlüssel')).toEqual(['schlüssel']);
  });

  it('keeps French and Italian words whole', () => {
    expect(tokenise('écharpe française')).toEqual(['écharpe', 'française']);
    expect(tokenise('occhiali')).toEqual(['occhiali']);
  });

  it('keeps an elided article attached rather than emitting a one-letter token', () => {
    expect(tokenise("l'écharpe")).toEqual(["l'écharpe"]);
  });

  it('keeps a hyphenated compound as one token', () => {
    expect(tokenise('Portemonnaie-Etui')).toEqual(['portemonnaie-etui']);
  });

  it('strips punctuation at the edges of a word', () => {
    expect(tokenise('«Rucksack»')).toEqual(['rucksack']);
  });
});

describe('stopwords are applied across all four languages at once', () => {
  it('removes German, French, Italian and English function words alike', () => {
    // The trap this guards: if one language's function words survive and
    // another's do not, a description in the surviving language scores higher
    // for no reason connected to the object.
    expect(tokenise('der schwarze Rucksack')).toEqual(['schwarze', 'rucksack']);
    expect(tokenise('le sac à dos noir')).toEqual(['sac', 'dos', 'noir']);
    expect(tokenise('lo zaino nero')).toEqual(['zaino', 'nero']);
    expect(tokenise('the black backpack')).toEqual(['black', 'backpack']);
  });

  it('leaves no function word behind in any of the four languages', () => {
    // NOT a token-count parity check. An earlier version of this test asserted
    // that the same sentence yields the same number of tokens in all four
    // languages, and it failed — correctly. German says "Rucksack" where
    // French says "sac à dos"; a compounding language and an analytic one
    // cannot produce equal counts, and no stopword list can make them.
    //
    // The property that actually matters is coverage: whatever a description
    // is written in, its function words are gone, so no language is advantaged
    // by having had its filler left in.
    const functionWords = [
      'der',
      'mit',
      'einem',
      'le',
      'avec',
      'un',
      'lo',
      'con',
      'the',
      'with',
      'a',
    ];

    const outputs = [
      tokenise('der schwarze Rucksack mit einem Laptop'),
      tokenise('le sac à dos noir avec un ordinateur'),
      tokenise('lo zaino nero con un computer'),
      tokenise('the black backpack with a laptop'),
    ];

    for (const tokens of outputs) {
      for (const filler of functionWords) {
        expect(tokens).not.toContain(filler);
      }
      // And every one of them still yields something to match on.
      expect(tokens.length).toBeGreaterThan(0);
    }
  });

  it('removes words every description contains', () => {
    // "I lost it on the train" describes no object.
    expect(tokenise('Im Zug vergessen')).toEqual([]);
  });
});

describe('tokenise hygiene', () => {
  it('drops tokens shorter than three characters', () => {
    expect(tokenise('ca 20 cm')).toEqual([]);
  });

  it('deduplicates, so repetition cannot inflate a score', () => {
    expect(tokenise('schwarz schwarz schwarz Tasche')).toEqual(['schwarz', 'tasche']);
  });

  it('returns nothing for empty input', () => {
    expect(tokenise('')).toEqual([]);
    expect(tokenise('   ')).toEqual([]);
  });
});

describe('candidate identifier fragments', () => {
  it('finds something that could be a serial number', () => {
    expect(candidateIdentifierFragments('Laptop, Seriennummer C02XY1234')).toContain('C02XY1234');
  });

  it('ignores a lone coach or seat number', () => {
    // "7" and "A4" are spacetime, not identity — they belong in the coach and
    // seat fields, and offering them as identifiers would teach people that an
    // identifier is anything numeric.
    expect(candidateIdentifierFragments('Wagen 7, Platz A4')).toEqual([]);
  });

  it('does not decide anything — it only proposes', () => {
    // The identifier table holds asserted values, never inferred ones. This
    // function's whole contract is that a person confirms what it returns.
    const found = candidateIdentifierFragments('IMEI 490154203237518');
    expect(found).toContain('490154203237518');
  });
});
