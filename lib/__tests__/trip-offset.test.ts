/**
 * The journey-suggestion reason, in four languages.
 *
 * WHAT THIS REPLACED
 *
 * The reason was a sentence built on the SERVER and rendered raw:
 *
 *     `${minutes} min before the stated time (timetable)`
 *
 * English, always, for every reader — sitting in the middle of the most
 * important step of the flow, where a passenger chooses between two trains.
 * It survived because it was data as far as the client was concerned, so the
 * i18n rule ("no display string outside a catalogue") never applied to it and
 * no test could see it. It was found by loading the app in French and reading
 * the screen.
 *
 * The lesson is the assertion below that loops over LOCALES: a formatter that
 * is only ever checked in the reference locale is a formatter that is only
 * correct in the reference locale.
 */
import { CATALOGUES, LOCALES } from '../i18n';
import { describeOffset } from '../report-flow';
import { translator } from '../i18n';

describe('describing why a journey is suggested', () => {
  it('says "at the stated time" for an exact match, with no number', () => {
    // Not "0 min before": a zero offset is a different sentence, not a
    // degenerate case of the other two.
    expect(describeOffset(0, translator('en'))).toBe('at the stated time');
    expect(describeOffset(0, translator('de'))).toBe('zur angegebenen Zeit');
  });

  it('puts a negative offset before the stated time', () => {
    expect(describeOffset(-10, translator('en'))).toBe('10 min before');
    expect(describeOffset(-10, translator('de'))).toBe('10 min vorher');
  });

  it('puts a positive offset after it', () => {
    expect(describeOffset(7, translator('en'))).toBe('7 min after');
    expect(describeOffset(7, translator('fr'))).toBe('7 min après');
  });

  it('never renders a negative sign — the direction is a word', () => {
    // "-10 min before" would say it twice and "−10 min after" would say it
    // wrong. The sign chooses the word; the magnitude is what is printed.
    for (const locale of LOCALES) {
      expect(describeOffset(-10, translator(locale))).not.toMatch(/-|−/);
    }
  });

  it.each([...LOCALES])('renders in %s without falling back to English', (locale) => {
    const t = translator(locale);
    const before = describeOffset(-3, t);
    const at = describeOffset(0, t);

    expect(before).toContain('3 min');
    expect(before.length).toBeGreaterThan('3 min '.length);
    expect(at.length).toBeGreaterThan(0);

    if (locale !== 'en') {
      // The exact failure this replaced: every reader got the English string.
      expect(before).not.toContain('before');
      expect(at).not.toBe('at the stated time');
    }
  });

  it('has the source labels every locale needs', () => {
    // Rendered alongside the offset as "(Fahrplan)" / "(horaire)". A missing
    // one would silently fall back and reintroduce English next to a
    // correctly translated offset, which reads as a bug in the translation.
    for (const locale of LOCALES) {
      expect(CATALOGUES[locale]['trip.source.timetable']).toBeTruthy();
      expect(CATALOGUES[locale]['trip.source.actual']).toBeTruthy();
      expect(CATALOGUES[locale]['trip.suggest.unknown']).toBeTruthy();
    }
  });
});
