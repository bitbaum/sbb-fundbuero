import {
  REPORT_STEPS,
  canAdvance,
  elapsedSeconds,
  emptyDraft,
  finishTiming,
  nextStep,
  offsetToIso,
  previousStep,
  startTiming,
  toRequestBody,
  type ReportDraft,
} from '../report-flow';

const NOW = new Date('2026-09-10T14:30:00Z');

function draft(over: Partial<ReportDraft> = {}): ReportDraft {
  return { ...emptyDraft(NOW), ...over };
}

describe('the default costs no taps', () => {
  it('starts with the time already set to now', () => {
    // Someone who has just realised they left a bag is not going to operate a
    // datetime picker on a moving train. The commonest case must need no
    // input at all.
    expect(emptyDraft(NOW).at).toBe(NOW.toISOString());
  });

  it('offers quick offsets rather than a picker', () => {
    expect(offsetToIso(NOW, 15)).toBe('2026-09-10T14:15:00.000Z');
    expect(offsetToIso(NOW, 0)).toBe(NOW.toISOString());
  });
});

describe('advancing', () => {
  it('will not leave the journey step without a station', () => {
    expect(canAdvance('journey', draft({ journeyId: 'j1' }))).toBe(false);
  });

  it('LETS SOMEONE THROUGH who does not know which train they were on', () => {
    // A report that could not be bound to a trip is still worth having.
    // Refusing it would lose the report entirely, which is strictly worse for
    // both the passenger and the matcher.
    expect(canAdvance('journey', draft({ stationId: 's1', journeyUnknown: true }))).toBe(true);
  });

  it('needs a category and a description worth matching on', () => {
    expect(canAdvance('item', draft({ category: 'electronics', description: 'ab' }))).toBe(false);
    expect(canAdvance('item', draft({ category: 'electronics', description: 'Handy' }))).toBe(true);
    expect(canAdvance('item', draft({ description: 'Handy' }))).toBe(false);
  });

  it('never blocks on where in the vehicle', () => {
    // Coach and seat are the most valuable optional fields and the ones people
    // least often remember. Requiring them would trade a whole report for a
    // detail.
    expect(canAdvance('place', draft())).toBe(true);
  });

  it('requires exactly one way to reach the person', () => {
    expect(canAdvance('contact', draft())).toBe(false);
    expect(canAdvance('contact', draft({ email: 'a@example.invalid' }))).toBe(true);
    expect(canAdvance('contact', draft({ phone: '+41790000000' }))).toBe(true);
  });
});

describe('step order', () => {
  it('asks which journey FIRST', () => {
    // The journey is the signal that makes the product work, and it is the
    // thing a passenger is most likely to still know while sitting on the
    // train. Asking for it last would collect it least often.
    expect(REPORT_STEPS[0]).toBe('journey');
  });

  it('walks forwards and backwards and stops at the ends', () => {
    expect(nextStep('journey')).toBe('item');
    expect(nextStep('contact')).toBeNull();
    expect(previousStep('journey')).toBeNull();
    expect(previousStep('item')).toBe('journey');
  });
});

describe('the request body', () => {
  it('widens a stated moment into a window', () => {
    // A loss is noticed at a moment but happens over a window. Half an hour
    // either side is the honest reading of "about then".
    const body = toRequestBody(draft({ at: NOW.toISOString() }), 'de');
    expect(body.lostFrom).toBe('2026-09-10T14:00:00.000Z');
    expect(body.lostTo).toBe('2026-09-10T15:00:00.000Z');
  });

  it('omits an identifier that was left blank', () => {
    expect(toRequestBody(draft(), 'de').identifiers).toEqual([]);
  });

  it('DETECTS that a typed IMEI is an IMEI', () => {
    // The bug this pins, found by driving the real browser: the form has one
    // identifier box ("serial number, IMEI or engraving") and used to store
    // everything as `serial`. A passenger's IMEI was then recorded under a
    // different kind from the same IMEI read off the device by staff — and
    // agreement compares kind AND value, so the strongest signal in the system
    // was silently off. Every symptom looked like "no match found".
    const body = toRequestBody(draft({ identifierValue: ' 49 015420 323751 8 ' }), 'de');
    expect(body.identifiers).toEqual([{ kind: 'imei', value: '49 015420 323751 8' }]);
  });

  it('falls back to serial for anything that is not a valid IMEI', () => {
    // Only the IMEI can be detected, because only the IMEI has a checksum.
    // `serial` is the honest "we do not know which".
    expect(toRequestBody(draft({ identifierValue: 'C02XY1234' }), 'de').identifiers).toEqual([
      { kind: 'serial', value: 'C02XY1234' },
    ]);
    // 15 digits that FAIL Luhn are not an IMEI, however much they look like one.
    expect(toRequestBody(draft({ identifierValue: '490154203237519' }), 'de').identifiers).toEqual([
      { kind: 'serial', value: '490154203237519' },
    ]);
  });

  it('sends null rather than empty strings for optional fields', () => {
    // '' would store an empty coach, which reads as "coach: nothing" instead
    // of "not known" and would be compared as a value by the matcher.
    const body = toRequestBody(draft({ coach: '  ', colour: '' }), 'de');
    expect(body.coach).toBeNull();
    expect(body.colour).toBeNull();
  });

  it('carries the locale, so we can answer in the language they asked in', () => {
    expect(toRequestBody(draft(), 'it').locale).toBe('it');
  });
});

describe('the clock on time-to-report', () => {
  it('does not start until the first interaction', () => {
    // A page left open in a tab must not report a two-hour time-to-report.
    // That is the difference between a metric and a number.
    const timing = { startedAt: null, submittedAt: null };
    expect(elapsedSeconds(timing)).toBeNull();
  });

  it('starts once and does not restart', () => {
    const first = startTiming({ startedAt: null, submittedAt: null }, 1000);
    const second = startTiming(first, 9999);
    expect(second.startedAt).toBe(1000);
  });

  it('measures from first interaction to submit', () => {
    let timing = startTiming({ startedAt: null, submittedAt: null }, 10_000);
    timing = finishTiming(timing, 52_000);
    expect(elapsedSeconds(timing)).toBe(42);
  });

  it('reports nothing until the report is actually submitted', () => {
    const timing = startTiming({ startedAt: null, submittedAt: null }, 10_000);
    expect(elapsedSeconds(timing)).toBeNull();
  });
});
